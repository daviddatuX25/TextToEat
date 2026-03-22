<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\ActionLog;
use App\Models\Order;
use App\Models\Setting;
use App\Services\OrderStatusNotificationService;
use App\Support\MenuManualResetWindow;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
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
        [$windowFrom, $windowUntil] = MenuManualResetWindow::bounds();
        $autoResetEnabled = (bool) Setting::get('menu.auto_reset_enabled', false);
        $autoResetAtHour = (int) Setting::get('menu.auto_reset_at_hour', $windowUntil);
        $lastResetDate = Cache::get('menu_reset_date');

        $levelsReminder = [
            'low_stock_threshold' => (int) Setting::get('menu.low_stock_threshold', 5),
            'low_stock_badge_style' => Setting::get('menu.low_stock_badge_style', 'count'),
        ];

        return Inertia::render('MenuSettings', [
            'menu' => [
                'reset_morning_from_hour' => $windowFrom,
                'reset_morning_until_hour' => $windowUntil,
                'manual_reset_within_window' => MenuManualResetWindow::isNowWithinWindow(),
                'manual_reset_window_label' => MenuManualResetWindow::describeBounds($windowFrom, $windowUntil),
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
            'menu.reset_morning_from_hour' => ['sometimes', 'integer', 'min:0', 'max:23'],
            'menu.reset_morning_until_hour' => ['sometimes', 'integer', 'min:0', 'max:23'],
            'menu.auto_reset_enabled' => ['sometimes', 'boolean'],
            'menu.auto_reset_at_hour' => ['sometimes', 'integer', 'min:0', 'max:23'],
            'menu.low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'menu.low_stock_badge_style' => ['sometimes', 'string', 'in:count,one'],
        ]);

        $userId = $request->user()?->id;
        $menu = $validated['menu'] ?? [];
        if (array_key_exists('reset_morning_from_hour', $menu)) {
            Setting::set('menu.reset_morning_from_hour', (int) $menu['reset_morning_from_hour'], $userId);
        }
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
        $orders = $this->unfulfilledOrdersPlacedBefore(now())
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
     * Run manual menu reset (rollover + reset today's items). Optional: cancel all unfulfilled orders placed before this request.
     */
    public function runReset(Request $request): RedirectResponse|JsonResponse
    {
        $request->validate([
            'force' => ['sometimes', 'boolean'],
            'cancel_previous_unfulfilled' => ['sometimes', 'boolean'],
        ]);

        $force = $request->boolean('force');
        $cancelPreviousUnfulfilled = $request->boolean('cancel_previous_unfulfilled');

        $userId = $request->user()?->id;
        $cancelledCount = 0;

        if ($cancelPreviousUnfulfilled) {
            $cancelBefore = now();
            $orders = $this->unfulfilledOrdersPlacedBefore($cancelBefore)->get();

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

        if (! $force && ! MenuManualResetWindow::isNowWithinWindow()) {
            [$from, $until] = MenuManualResetWindow::bounds();
            $windowLabel = MenuManualResetWindow::describeBounds($from, $until);
            $rolloverMsg = "Menu rollover was skipped — manual rollover is only allowed when the server hour is within {$windowLabel} unless you check \"Run even after cutoff\".";
            if ($request->wantsJson()) {
                $message = $cancelledCount > 0
                    ? $cancelledCount.' unfulfilled order(s) cancelled. '.$rolloverMsg
                    : $rolloverMsg;

                return response()->json([
                    'message' => $message,
                    'cancelled_count' => $cancelledCount,
                    'menu_reset_ran' => false,
                ], $cancelledCount > 0 ? 200 : 422);
            }
            if ($cancelledCount > 0) {
                return redirect()->route('portal.menu-settings')->with(
                    'success',
                    $cancelledCount.' unfulfilled order(s) cancelled (placed before this reset). '.$rolloverMsg
                );
            }

            return redirect()->route('portal.menu-settings')->with('error', $rolloverMsg);
        }

        Artisan::call('menu:reset-today', ['--force' => $force]);

        $success = 'Menu reset run successfully.';
        if ($cancelledCount > 0) {
            $success .= ' '.$cancelledCount.' unfulfilled order(s) placed before this reset were cancelled.';
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => $success,
                'cancelled_count' => $cancelledCount,
                'menu_reset_ran' => true,
            ]);
        }

        return redirect()->route('portal.menu-settings')->with('success', $success);
    }

    /**
     * All unfulfilled orders whose created_at is strictly before $before (e.g. the moment reset runs).
     * Includes earlier today, yesterday, and any older row — anything already in the system when you confirm.
     *
     * @return Builder<Order>
     */
    private function unfulfilledOrdersPlacedBefore(Carbon $before): Builder
    {
        $statuses = array_map(fn (OrderStatus $s) => $s->value, OrderStatus::unfulfilledStatuses());

        return Order::query()
            ->whereIn('status', $statuses)
            ->where('orders.created_at', '<', $before);
    }
}
