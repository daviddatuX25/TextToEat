<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\ChatbotSession;
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

        // Low-stock badge: today's menu only (menu_date = today), virtual available from daily stock + reservations.
        $today = Carbon::today();
        $threshold = (int) Setting::get('menu.low_stock_threshold', 5);
        $badgeStyle = Setting::get('menu.low_stock_badge_style', 'count');
        $lowCount = $this->stockService->countLowStockOnTodaysMenu($threshold);
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
