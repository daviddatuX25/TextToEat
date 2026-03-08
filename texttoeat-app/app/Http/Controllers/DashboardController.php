<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = Carbon::today();

        // Daily performance metrics (today)
        $ordersTodayQuery = Order::query()
            ->whereDate('created_at', $today);

        $ordersToday = (clone $ordersTodayQuery)->count();

        $completedTodayQuery = Order::query()
            ->whereDate('created_at', $today)
            ->where('status', OrderStatus::Completed);

        $completedToday = (clone $completedTodayQuery)->count();

        $revenueToday = (float) (clone $completedTodayQuery)->sum('total') ?: 0.0;

        $avgOrderValueToday = $completedToday > 0
            ? $revenueToday / $completedToday
            : 0.0;

        $completionRateToday = $ordersToday > 0
            ? round(($completedToday / $ordersToday) * 100, 1)
            : 0.0;

        $cancelledToday = Order::query()
            ->whereDate('created_at', $today)
            ->where('status', OrderStatus::Cancelled)
            ->count();

        $yesterday = Carbon::yesterday();
        $ordersYesterday = Order::query()->whereDate('created_at', $yesterday)->count();
        $revenueYesterday = (float) Order::query()
            ->whereDate('created_at', $yesterday)
            ->where('status', OrderStatus::Completed)
            ->sum('total') ?: 0.0;

        // Real-time operations metrics (today's orders only)
        $activeOrdersQuery = Order::query()
            ->whereDate('created_at', $today)
            ->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled]);

        $activeOrdersNow = (clone $activeOrdersQuery)->count();

        $activeDelivery = (clone $activeOrdersQuery)
            ->where('delivery_type', 'delivery')
            ->count();

        $activePickup = (clone $activeOrdersQuery)
            ->where('delivery_type', 'pickup')
            ->count();

        $activeWalkin = (clone $activeOrdersQuery)
            ->where('channel', OrderChannel::WalkIn)
            ->count();

        $pipelinePending = Order::query()
            ->whereDate('created_at', $today)
            ->where('status', OrderStatus::Received)
            ->count();

        $pipelinePreparing = Order::query()
            ->whereDate('created_at', $today)
            ->where('status', OrderStatus::Preparing)
            ->count();

        $pipelineReady = Order::query()
            ->whereDate('created_at', $today)
            ->whereIn('status', [OrderStatus::Ready, OrderStatus::OnTheWay])
            ->count();

        $readyDelivery = Order::query()
            ->whereDate('created_at', $today)
            ->where('delivery_type', 'delivery')
            ->where('status', OrderStatus::Ready)
            ->count();

        $readyPickup = Order::query()
            ->whereDate('created_at', $today)
            ->where('delivery_type', 'pickup')
            ->where('status', OrderStatus::Ready)
            ->count();

        // Analytics: by channel (today)
        $byChannel = Order::query()
            ->select('channel')
            ->selectRaw('COUNT(*) as orders_today')
            ->selectRaw("SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_today", [OrderStatus::Completed->value])
            ->selectRaw("SUM(CASE WHEN status = ? THEN total ELSE 0 END) as revenue_today", [OrderStatus::Completed->value])
            ->whereDate('created_at', $today)
            ->groupBy('channel')
            ->get()
            ->map(static function ($row): array {
                return [
                    'channel' => $row->channel,
                    'orders_today' => (int) $row->orders_today,
                    'completed_today' => (int) $row->completed_today,
                    'revenue_today' => (float) $row->revenue_today,
                ];
            })
            ->values()
            ->all();

        // Analytics: by fulfillment type (today)
        $byFulfillment = [];

        $deliveryTodayQuery = Order::query()
            ->whereDate('created_at', $today)
            ->where('delivery_type', 'delivery');

        $deliveryOrdersToday = (clone $deliveryTodayQuery)->count();
        $deliveryCompletedToday = (clone $deliveryTodayQuery)
            ->where('status', OrderStatus::Completed)
            ->count();
        $deliveryRevenueToday = (float) (clone $deliveryTodayQuery)
            ->where('status', OrderStatus::Completed)
            ->sum('total') ?: 0.0;

        $byFulfillment[] = [
            'type' => 'delivery',
            'orders_today' => $deliveryOrdersToday,
            'completed_today' => $deliveryCompletedToday,
            'revenue_today' => $deliveryRevenueToday,
        ];

        $pickupTodayQuery = Order::query()
            ->whereDate('created_at', $today)
            ->where('delivery_type', 'pickup');

        $pickupOrdersToday = (clone $pickupTodayQuery)->count();
        $pickupCompletedToday = (clone $pickupTodayQuery)
            ->where('status', OrderStatus::Completed)
            ->count();
        $pickupRevenueToday = (float) (clone $pickupTodayQuery)
            ->where('status', OrderStatus::Completed)
            ->sum('total') ?: 0.0;

        $byFulfillment[] = [
            'type' => 'pickup',
            'orders_today' => $pickupOrdersToday,
            'completed_today' => $pickupCompletedToday,
            'revenue_today' => $pickupRevenueToday,
        ];

        $walkinTodayQuery = Order::query()
            ->whereDate('created_at', $today)
            ->where('channel', OrderChannel::WalkIn);

        $walkinOrdersToday = (clone $walkinTodayQuery)->count();
        $walkinCompletedToday = (clone $walkinTodayQuery)
            ->where('status', OrderStatus::Completed)
            ->count();
        $walkinRevenueToday = (float) (clone $walkinTodayQuery)
            ->where('status', OrderStatus::Completed)
            ->sum('total') ?: 0.0;

        $byFulfillment[] = [
            'type' => 'walkin',
            'orders_today' => $walkinOrdersToday,
            'completed_today' => $walkinCompletedToday,
            'revenue_today' => $walkinRevenueToday,
        ];

        // Revenue by hour of the day (today only) for chart
        $revenueByHour = [];
        for ($hour = 0; $hour < 24; $hour++) {
            $hourStart = $today->copy()->setHour($hour)->setMinute(0)->setSecond(0);
            $hourEnd = $today->copy()->setHour($hour)->setMinute(59)->setSecond(59);
            $revenueByHour[] = [
                'hour' => $hour,
                'label' => $hour === 0 ? '12am' : ($hour < 12 ? "{$hour}am" : ($hour === 12 ? '12pm' : ($hour - 12) . 'pm')),
                'walkin' => (float) Order::query()
                    ->where('channel', OrderChannel::WalkIn)
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$hourStart, $hourEnd])
                    ->sum('total'),
                'delivery' => (float) Order::query()
                    ->where('delivery_type', 'delivery')
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$hourStart, $hourEnd])
                    ->sum('total'),
                'pickup' => (float) Order::query()
                    ->where('delivery_type', 'pickup')
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$hourStart, $hourEnd])
                    ->sum('total'),
            ];
        }

        // Analytics: top items today (from completed orders created today)
        $topItems = OrderItem::query()
            ->select('name')
            ->selectRaw('SUM(quantity) as total_qty')
            ->selectRaw('SUM(quantity * price) as total_revenue')
            ->whereHas('order', static function ($query) use ($today): void {
                $query->whereDate('created_at', $today)
                    ->where('status', OrderStatus::Completed);
            })
            ->groupBy('name')
            ->orderByDesc(DB::raw('SUM(quantity)'))
            ->limit(5)
            ->get()
            ->map(static function ($row): array {
                return [
                    'name' => $row->name,
                    'total_qty' => (int) $row->total_qty,
                    'total_revenue' => (float) $row->total_revenue,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Dashboard', [
            'metrics' => [
                'overview' => [
                    'orders_today' => $ordersToday,
                    'completed_today' => $completedToday,
                    'revenue_today' => $revenueToday,
                    'avg_order_value_today' => $avgOrderValueToday,
                    'completion_rate_today' => $completionRateToday,
                    'cancelled_today' => $cancelledToday,
                    'orders_yesterday' => $ordersYesterday,
                    'revenue_yesterday' => $revenueYesterday,
                ],
                'realtime' => [
                    'active_orders_now' => $activeOrdersNow,
                    'active_delivery' => $activeDelivery,
                    'active_pickup' => $activePickup,
                    'active_walkin' => $activeWalkin,
                    'pipeline_pending' => $pipelinePending,
                    'pipeline_preparing' => $pipelinePreparing,
                    'pipeline_ready' => $pipelineReady,
                    'ready_delivery' => $readyDelivery,
                    'ready_pickup' => $readyPickup,
                ],
                'analytics' => [
                    'by_channel' => $byChannel,
                    'by_fulfillment' => $byFulfillment,
                    'top_items' => $topItems,
                    'revenue_by_hour' => $revenueByHour,
                ],

                // Backwards-compatible top-level keys (used by older dashboard layout).
                'orders_today' => $ordersToday,
                'ready_delivery' => $readyDelivery,
                'ready_pickup' => $readyPickup,
                'completed_today' => $completedToday,
            ],
        ]);
    }
}
