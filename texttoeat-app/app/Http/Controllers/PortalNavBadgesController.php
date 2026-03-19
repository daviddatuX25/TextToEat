<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\ChatbotSession;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Setting;
use App\Services\MenuItemStockService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class PortalNavBadgesController extends Controller
{
    public function __construct(
        private MenuItemStockService $stockService
    ) {}

    /**
     * Return badge counts for the portal sidebar (orders by page type, inbox conversations, low stock).
     * Used for initial load and real-time refetch after Echo events.
     */
    public function __invoke(): JsonResponse
    {
        $non_ready_orders = Order::query()
            ->whereIn('status', [OrderStatus::Received, OrderStatus::Preparing])
            ->count();

        // Ready-only (excludes Completed/Cancelled). Pickup = customer pickup (exclude walk-in).
        $ready_pickup_orders = Order::query()
            ->where('delivery_type', 'pickup')
            ->where('status', OrderStatus::Ready)
            ->where('channel', '!=', 'walkin')
            ->count();

        $ready_delivery_orders = Order::query()
            ->where('delivery_type', 'delivery')
            ->where('status', OrderStatus::Ready)
            ->count();

        $ready_walkin_orders = Order::query()
            ->where('channel', 'walkin')
            ->where('status', OrderStatus::Ready)
            ->count();

        // Inbox count: only active/pending sessions (exclude ended / "done" human takeover)
        $active_conversations = ChatbotSession::query()
            ->forInbox()
            ->sessionState(['active', 'pending'])
            ->count();

        // Low-stock badge: per-day stock based on MenuItemDailyStock (units_leftover < threshold).
        $today = Carbon::today();
        $threshold = (int) Setting::get('menu.low_stock_threshold', 5);
        $badgeStyle = Setting::get('menu.low_stock_badge_style', 'count');
        $lowCount = MenuItem::query()
            ->leftJoin('menu_item_daily_stock as s', function ($join) use ($today): void {
                $join->on('s.menu_item_id', '=', 'menu_items.id')
                    ->whereDate('s.menu_date', $today);
            })
            ->where(function ($q) use ($threshold): void {
                $q->whereNull('s.menu_item_id')
                    ->orWhere('s.units_leftover', '<', $threshold);
            })
            ->count();
        $low_stock_meals = $badgeStyle === 'one' ? min(1, $lowCount) : $lowCount;

        return response()->json([
            'non_ready_orders' => $non_ready_orders,
            'ready_pickup_orders' => $ready_pickup_orders,
            'ready_delivery_orders' => $ready_delivery_orders,
            'ready_walkin_orders' => $ready_walkin_orders,
            'active_conversations' => $active_conversations,
            'low_stock_meals' => $low_stock_meals,
            'low_stock_scope_date' => $today->toDateString(),
        ]);
    }
}
