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
            ->where('status', OrderStatus::Completed)
            ->whereDate('updated_at', $today);

        $completedToday = (clone $completedTodayQuery)->count();

        $revenueToday = (float) (clone $completedTodayQuery)->sum('total') ?: 0.0;

        $avgOrderValueToday = $completedToday > 0
            ? $revenueToday / $completedToday
            : 0.0;

        $completionRateToday = $ordersToday > 0
            ? round(($completedToday / $ordersToday) * 100, 1)
            : 0.0;

        $cancelledToday = Order::query()
            ->where('status', OrderStatus::Cancelled)
            ->whereDate('updated_at', $today)
            ->count();

        $yesterday = Carbon::yesterday();
        $ordersYesterday = Order::query()->whereDate('created_at', $yesterday)->count();
        $revenueYesterday = (float) Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereDate('updated_at', $yesterday)
            ->sum('total') ?: 0.0;

        // Last 7 days daily snapshots for interactive day picker (newest first: today, yesterday, ...)
        $dailyOverviews = [];
        for ($i = 0; $i < 7; $i++) {
            $date = Carbon::today()->subDays($i);
            $prevDate = Carbon::today()->subDays($i + 1);
            $dayOrders = Order::query()->whereDate('created_at', $date)->count();
            $dayCompleted = Order::query()
                ->where('status', OrderStatus::Completed)
                ->whereDate('updated_at', $date)
                ->count();
            $dayRevenue = (float) Order::query()
                ->where('status', OrderStatus::Completed)
                ->whereDate('updated_at', $date)
                ->sum('total') ?: 0.0;
            $dayCancelled = Order::query()
                ->where('status', OrderStatus::Cancelled)
                ->whereDate('updated_at', $date)
                ->count();
            $dayAvgOrderValue = $dayCompleted > 0 ? $dayRevenue / $dayCompleted : 0.0;
            $dayCompletionRate = $dayOrders > 0 ? round(($dayCompleted / $dayOrders) * 100, 1) : 0.0;
            $prevOrders = Order::query()->whereDate('created_at', $prevDate)->count();
            $prevRevenue = (float) Order::query()
                ->where('status', OrderStatus::Completed)
                ->whereDate('updated_at', $prevDate)
                ->sum('total') ?: 0.0;
            $dailyOverviews[] = [
                'date' => $date->toDateString(),
                'label' => $i === 0 ? 'Today' : ($i === 1 ? 'Yesterday' : $date->format('D, M j')),
                'orders' => $dayOrders,
                'completed' => $dayCompleted,
                'revenue' => $dayRevenue,
                'cancelled' => $dayCancelled,
                'avg_order_value' => $dayAvgOrderValue,
                'completion_rate' => $dayCompletionRate,
                'prev_date' => $prevDate->toDateString(),
                'prev_label' => $i === 0 ? 'Yesterday' : ($i === 1 ? '2 days ago' : $prevDate->format('D, M j')),
                'prev_orders' => $prevOrders,
                'prev_revenue' => $prevRevenue,
            ];
        }

        // Real-time operations metrics (right now)
        $activeOrdersQuery = Order::query()
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
            ->where('status', OrderStatus::Received)
            ->count();

        $pipelineConfirmed = Order::query()
            ->where('status', OrderStatus::Confirmed)
            ->count();

        $pipelineReady = Order::query()
            ->whereIn('status', [OrderStatus::Ready, OrderStatus::OnTheWay])
            ->count();

        $readyDelivery = Order::query()
            ->where('delivery_type', 'delivery')
            ->where('status', OrderStatus::Ready)
            ->count();

        $readyPickup = Order::query()
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

        // Revenue by fulfillment: weekly (last 7 days) and monthly (last 6 months) for chart
        $revenueWeekly = [];
        for ($i = 0; $i < 7; $i++) {
            $date = Carbon::today()->subDays(6 - $i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();
            $revenueWeekly[] = [
                'date' => $date->toDateString(),
                'label' => $date->format('D'),
                'walkin' => (float) Order::query()
                    ->where('channel', OrderChannel::WalkIn)
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$dayStart, $dayEnd])
                    ->sum('total'),
                'delivery' => (float) Order::query()
                    ->where('delivery_type', 'delivery')
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$dayStart, $dayEnd])
                    ->sum('total'),
                'pickup' => (float) Order::query()
                    ->where('delivery_type', 'pickup')
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$dayStart, $dayEnd])
                    ->sum('total'),
            ];
        }
        $revenueMonthly = [];
        for ($i = 0; $i < 6; $i++) {
            $month = Carbon::today()->subMonths(5 - $i)->startOfMonth();
            $monthEnd = $month->copy()->endOfMonth();
            $revenueMonthly[] = [
                'month' => $month->format('Y-m'),
                'label' => $month->format('M'),
                'walkin' => (float) Order::query()
                    ->where('channel', OrderChannel::WalkIn)
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$month, $monthEnd])
                    ->sum('total'),
                'delivery' => (float) Order::query()
                    ->where('delivery_type', 'delivery')
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$month, $monthEnd])
                    ->sum('total'),
                'pickup' => (float) Order::query()
                    ->where('delivery_type', 'pickup')
                    ->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$month, $monthEnd])
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
                'daily_overviews' => $dailyOverviews,
                'realtime' => [
                    'active_orders_now' => $activeOrdersNow,
                    'active_delivery' => $activeDelivery,
                    'active_pickup' => $activePickup,
                    'active_walkin' => $activeWalkin,
                    'pipeline_pending' => $pipelinePending,
                    'pipeline_confirmed' => $pipelineConfirmed,
                    'pipeline_ready' => $pipelineReady,
                    'ready_delivery' => $readyDelivery,
                    'ready_pickup' => $readyPickup,
                ],
                'analytics' => [
                    'by_channel' => $byChannel,
                    'by_fulfillment' => $byFulfillment,
                    'top_items' => $topItems,
                    'revenue_weekly' => $revenueWeekly,
                    'revenue_monthly' => $revenueMonthly,
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
