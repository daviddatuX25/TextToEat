<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\ActionLog;
use App\Models\Order;
use App\Models\Setting;
use App\Services\OrderStatusNotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class MenuSettingsController extends Controller
{
    /**
     * Show the Menu settings page: Menu & daily reset and Levels reminder only.
     */
    public function index(): Response
    {
        $menuResetHour = (int) Setting::get('menu.reset_morning_until_hour', config('menu.reset_morning_until_hour', 11));
        $autoResetEnabled = (bool) Setting::get('menu.auto_reset_enabled', false);
        $autoResetAtHour = (int) Setting::get('menu.auto_reset_at_hour', $menuResetHour);
        $lastResetDate = Cache::get('menu_reset_date');

        $levelsReminder = [
            'low_stock_threshold' => (int) Setting::get('menu.low_stock_threshold', 5),
            'low_stock_badge_style' => Setting::get('menu.low_stock_badge_style', 'count'),
        ];

        return Inertia::render('MenuSettings', [
            'menu' => [
                'reset_morning_until_hour' => $menuResetHour,
                'auto_reset_enabled' => $autoResetEnabled,
                'auto_reset_at_hour' => $autoResetAtHour,
                'last_reset_date' => $lastResetDate,
                'server_time' => now()->toIso8601String(),
            ],
            'levels_reminder' => $levelsReminder,
        ]);
    }

    /**
     * Update menu-related settings (reset hour, auto-reset, levels reminder).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'menu' => ['sometimes', 'array'],
            'menu.reset_morning_until_hour' => ['sometimes', 'integer', 'min:0', 'max:23'],
            'menu.auto_reset_enabled' => ['sometimes', 'boolean'],
            'menu.auto_reset_at_hour' => ['sometimes', 'integer', 'min:0', 'max:23'],
            'menu.low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'menu.low_stock_badge_style' => ['sometimes', 'string', 'in:count,one'],
        ]);

        $userId = $request->user()?->id;
        $menu = $validated['menu'] ?? [];
        if (array_key_exists('reset_morning_until_hour', $menu)) {
            Setting::set('menu.reset_morning_until_hour', (int) $menu['reset_morning_until_hour'], $userId);
        }
        if (array_key_exists('auto_reset_enabled', $menu)) {
            Setting::set('menu.auto_reset_enabled', (bool) $menu['auto_reset_enabled'], $userId);
        }
        if (array_key_exists('auto_reset_at_hour', $menu)) {
            Setting::set('menu.auto_reset_at_hour', (int) $menu['auto_reset_at_hour'], $userId);
        }
        if (array_key_exists('low_stock_threshold', $menu)) {
            Setting::set('menu.low_stock_threshold', (int) $menu['low_stock_threshold'], $userId);
        }
        if (array_key_exists('low_stock_badge_style', $menu)) {
            Setting::set('menu.low_stock_badge_style', $menu['low_stock_badge_style'], $userId);
        }

        return redirect()->route('portal.menu-settings')->with('success', 'Settings updated.');
    }

    /**
     * Preview orders that would be cancelled if "cancel previous unfulfilled" is checked.
     * No side effects.
     */
    public function previewResetCancellations(): JsonResponse
    {
        $today = Carbon::today();
        $statuses = array_map(fn (OrderStatus $s) => $s->value, OrderStatus::unfulfilledStatuses());
        $orders = Order::query()
            ->whereIn('status', $statuses)
            ->where('created_at', '<', $today)
            ->orderBy('created_at')
            ->get(['id', 'reference', 'status', 'created_at']);

        return response()->json([
            'count' => $orders->count(),
            'orders' => $orders->map(fn (Order $o) => [
                'id' => $o->id,
                'reference' => $o->reference,
                'status' => $o->status,
                'created_at' => $o->created_at?->toIso8601String(),
            ])->values()->all(),
        ]);
    }

    /**
     * Run manual menu reset (rollover + reset today's items). Optional: cancel unfulfilled orders from previous days.
     */
    public function runReset(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'force' => ['sometimes', 'boolean'],
            'cancel_previous_unfulfilled' => ['sometimes', 'boolean'],
        ]);

        $force = $validated['force'] ?? false;
        $cancelPreviousUnfulfilled = $validated['cancel_previous_unfulfilled'] ?? false;

        $hour = (int) Setting::get('menu.reset_morning_until_hour', config('menu.reset_morning_until_hour', 11));
        if (! $force && $hour >= 0 && now()->hour > $hour) {
            $message = "Manual reset is only allowed before hour {$hour}. Use \"Run even after cutoff\" to override.";
            if ($request->wantsJson()) {
                return response()->json(['message' => $message], 422);
            }
            return redirect()->route('portal.menu-settings')->with('error', $message);
        }

        $userId = $request->user()?->id;
        $cancelledCount = 0;

        if ($cancelPreviousUnfulfilled) {
            $today = Carbon::today();
            $statuses = array_map(fn (OrderStatus $s) => $s->value, OrderStatus::unfulfilledStatuses());
            $orders = Order::query()
                ->whereIn('status', $statuses)
                ->where('created_at', '<', $today)
                ->get();

            $notificationService = app(OrderStatusNotificationService::class);
            foreach ($orders as $order) {
                $originalStatus = $order->status;
                $order->status = OrderStatus::Cancelled->value;
                $order->save();
                event(new OrderUpdated($order, true, false));
                ActionLog::create([
                    'user_id' => $userId,
                    'action' => 'order_updated',
                    'model' => 'Order',
                    'model_id' => $order->id,
                    'payload' => [
                        'from_status' => $originalStatus,
                        'to_status' => $order->status,
                        'reason' => 'manual_menu_reset_cancel_previous_unfulfilled',
                    ],
                ]);
                if (in_array((string) $order->channel, ['sms', 'messenger'], true)) {
                    $notificationService->maybeNotify($order, (string) $originalStatus);
                }
                $cancelledCount++;
            }
        }

        Artisan::call('menu:reset-today', ['--force' => $force]);

        $success = 'Menu reset run successfully.';
        if ($cancelledCount > 0) {
            $success .= ' ' . $cancelledCount . ' unfulfilled order(s) from previous days were cancelled.';
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => $success, 'cancelled_count' => $cancelledCount]);
        }
        return redirect()->route('portal.menu-settings')->with('success', $success);
    }
}
