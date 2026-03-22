<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\ActionLog;
use App\Models\MenuItemDailyStock;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    /**
     * Default date range: last 30 days.
     */
    private function defaultFrom(): Carbon
    {
        return Carbon::today()->subDays(29);
    }

    private function defaultTo(): Carbon
    {
        return Carbon::today();
    }

    /**
     * Resolve date range from request; validate and clamp.
     */
    private function dateRange(Request $request): array
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);
        $from = isset($validated['date_from'])
            ? Carbon::parse($validated['date_from'])->startOfDay()
            : $this->defaultFrom();
        $to = isset($validated['date_to'])
            ? Carbon::parse($validated['date_to'])->endOfDay()
            : $this->defaultTo();
        if ($from->gt($to)) {
            $to = $from->copy()->endOfDay();
        }

        return [$from, $to];
    }

    /**
     * Fulfillment type for an order: walkin | delivery | pickup.
     */
    private function fulfillmentType(Order $order): string
    {
        if ($order->channel === OrderChannel::WalkIn->value) {
            return 'walkin';
        }

        return $order->delivery_type === 'delivery' ? 'delivery' : 'pickup';
    }

    public function index(Request $request): Response|StreamedResponse
    {
        [$from, $to] = $this->dateRange($request);

        if ($request->get('export') === 'csv') {
            return $this->exportCsv($from, $to);
        }

        $days = $from->diffInDays($to) + 1;
        $prevFrom = $from->copy()->subDays($days)->startOfDay();
        $prevTo = $from->copy()->subDay()->endOfDay();

        // --- Tab 1: Sales ---
        $ordersQuery = Order::query()->whereBetween('created_at', [$from, $to]);
        $ordersCount = (clone $ordersQuery)->count();
        $completedQuery = Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$from, $to]);
        $completedCount = (clone $completedQuery)->count();
        $revenue = (float) (clone $completedQuery)->sum('total') ?: 0.0;
        $cancelledCount = Order::query()
            ->where('status', OrderStatus::Cancelled)
            ->whereBetween('updated_at', [$from, $to])
            ->count();
        $aov = $completedCount > 0 ? $revenue / $completedCount : 0.0;
        $completionRate = $ordersCount > 0 ? round(($completedCount / $ordersCount) * 100, 1) : 0.0;

        // Period-over-period (previous period of same length)
        $prevCompleted = Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$prevFrom, $prevTo])
            ->count();
        $prevRevenue = (float) Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$prevFrom, $prevTo])
            ->sum('total') ?: 0.0;
        $revenueChangePercent = $prevRevenue > 0
            ? round((($revenue - $prevRevenue) / $prevRevenue) * 100)
            : null;
        $ordersChangePercent = $prevCompleted > 0
            ? round((($completedCount - $prevCompleted) / $prevCompleted) * 100)
            : null;

        // Best day in range (by revenue)
        $bestDay = Order::query()
            ->selectRaw('DATE(updated_at) as day')
            ->selectRaw('SUM(total) as rev')
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$from, $to])
            ->groupBy('day')
            ->orderByDesc('rev')
            ->first();
        $best_day_date = $bestDay ? $bestDay->day : null;
        $best_day_revenue = $bestDay ? (float) $bestDay->rev : 0.0;

        // Revenue by day (stacked area): walkin, delivery, pickup
        $revenueByDay = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $dayStart = $cursor->copy()->startOfDay();
            $dayEnd = $cursor->copy()->endOfDay();
            $revenueByDay[] = [
                'date' => $cursor->toDateString(),
                'label' => $cursor->format('M j'),
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
            $cursor->addDay();
        }

        // Orders by channel (donut)
        $byChannel = Order::query()
            ->select('channel')
            ->selectRaw('COUNT(*) as count')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('channel')
            ->get()
            ->map(fn ($row) => ['channel' => $row->channel, 'count' => (int) $row->count])
            ->values()
            ->all();

        // Orders by fulfillment (donut): walkin | delivery | pickup
        $byFulfillment = [];
        $walkinOrders = Order::query()
            ->where('channel', OrderChannel::WalkIn)
            ->whereBetween('created_at', [$from, $to])
            ->count();
        $byFulfillment[] = ['fulfillment' => 'walkin', 'count' => $walkinOrders];
        $byFulfillment[] = [
            'fulfillment' => 'delivery',
            'count' => Order::query()
                ->where('delivery_type', 'delivery')
                ->whereBetween('created_at', [$from, $to])
                ->count(),
        ];
        $byFulfillment[] = [
            'fulfillment' => 'pickup',
            'count' => Order::query()
                ->where('delivery_type', 'pickup')
                ->whereBetween('created_at', [$from, $to])
                ->count(),
        ];

        // Payment health: paid vs unpaid (completed orders in range)
        $paidCount = Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$from, $to])
            ->where('payment_status', 'paid')
            ->count();
        $unpaidCount = Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$from, $to])
            ->where('payment_status', 'unpaid')
            ->count();
        $payment_health = [
            'paid' => $paidCount,
            'unpaid' => $unpaidCount,
            'total_completed' => $completedCount,
        ];

        // --- Tab 2: Menu Intelligence ---
        $leaderboard = $this->menuLeaderboard($from, $to);
        $risingFalling = $this->risingFallingItems($from, $to);
        $coOccurrence = $this->coOccurrencePairs($from, $to);

        // --- Tab 3: Operations ---
        $heatmap = $this->ordersHeatmap($from, $to);
        $fulfillmentSpeed = $this->fulfillmentSpeedStats($from, $to);
        $completionRateByDay = $this->completionRateByDay($from, $to);

        // --- Report card (string interpolation, no AI) ---
        $reportCard = $this->buildReportCard($from, $to, [
            'orders_count' => $ordersCount,
            'completed_count' => $completedCount,
            'revenue' => $revenue,
            'completion_rate' => $completionRate,
            'cancelled_count' => $cancelledCount,
            'aov' => $aov,
            'best_day_date' => $best_day_date,
            'best_day_revenue' => $best_day_revenue,
            'by_fulfillment' => $byFulfillment,
        ]);

        return Inertia::render('Analytics', [
            'date_from' => $from->toDateString(),
            'date_to' => $to->toDateString(),
            'sales' => [
                'revenue' => $revenue,
                'revenue_change_percent' => $revenueChangePercent,
                'orders_count' => $ordersCount,
                'completed_count' => $completedCount,
                'cancelled_count' => $cancelledCount,
                'aov' => $aov,
                'completion_rate' => $completionRate,
                'best_day_date' => $best_day_date,
                'best_day_revenue' => $best_day_revenue,
                'revenue_by_day' => $revenueByDay,
                'by_channel' => $byChannel,
                'by_fulfillment' => $byFulfillment,
                'payment_health' => $payment_health,
                'period_days' => (int) round($days),
                'prev_from' => $prevFrom->toDateString(),
                'prev_to' => $prevTo->toDateString(),
            ],
            'menu_intelligence' => [
                'leaderboard' => $leaderboard,
                'rising_falling' => $risingFalling,
                'co_occurrence' => $coOccurrence,
            ],
            'operations' => [
                'heatmap' => $heatmap,
                'fulfillment_speed' => $fulfillmentSpeed,
                'completion_rate_by_day' => $completionRateByDay,
                'report_card' => $reportCard,
            ],
        ]);
    }

    /**
     * Leaderboard: item name, units sold, revenue, sell-through % (when daily stock exists), trend vs previous period.
     *
     * Sell-through matches the Units column: completed order quantity for that line-item name in range,
     * divided by the sum of daily {@see MenuItemDailyStock::units_set} for all catalog rows with that
     * item name in the same date range. This stays aligned with sales even when the per-day units_sold
     * ledger was not incremented (e.g. legacy lines without menu_item_id). Null when no units_set in range.
     */
    private function menuLeaderboard(Carbon $from, Carbon $to): array
    {
        $prevFrom = $from->copy()->subDays($from->diffInDays($to) + 1);
        $prevTo = $from->copy()->subDay();

        $items = OrderItem::query()
            ->select('name')
            ->selectRaw('SUM(quantity) as total_qty')
            ->selectRaw('SUM(quantity * price) as total_revenue')
            ->whereHas('order', static function ($q) use ($from, $to): void {
                $q->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$from, $to]);
            })
            ->groupBy('name')
            ->orderByDesc(DB::raw('SUM(quantity)'))
            ->get();

        $prevQty = OrderItem::query()
            ->select('name')
            ->selectRaw('SUM(quantity) as total_qty')
            ->whereHas('order', static function ($q) use ($prevFrom, $prevTo): void {
                $q->where('status', OrderStatus::Completed)
                    ->whereBetween('updated_at', [$prevFrom, $prevTo]);
            })
            ->groupBy('name')
            ->get()
            ->keyBy('name');

        $unitsSetSumByName = MenuItemDailyStock::query()
            ->join('menu_items', 'menu_items.id', '=', 'menu_item_daily_stock.menu_item_id')
            ->whereBetween('menu_item_daily_stock.menu_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('menu_items.name as item_name')
            ->selectRaw('COALESCE(SUM(menu_item_daily_stock.units_set), 0) as units_set_sum')
            ->groupBy('menu_items.name')
            ->get()
            ->keyBy('item_name');

        $result = [];
        foreach ($items as $row) {
            $name = $row->name ?? '—';
            $totalQty = (int) $row->total_qty;
            $totalRevenue = (float) $row->total_revenue;
            $prev = $prevQty->get($name);
            $prevQtyVal = $prev ? (int) $prev->total_qty : 0;
            $trend = $prevQtyVal !== 0 ? round((($totalQty - $prevQtyVal) / $prevQtyVal) * 100) : null;

            $sellThroughPct = null;
            $setRow = $unitsSetSumByName->get($name);
            $setSum = $setRow ? (int) $setRow->units_set_sum : 0;
            if ($setSum > 0) {
                $sellThroughPct = round(($totalQty / $setSum) * 100, 1);
            }

            $result[] = [
                'name' => $name,
                'units_sold' => $totalQty,
                'revenue' => $totalRevenue,
                'sell_through_pct' => $sellThroughPct,
                'trend' => $trend,
            ];
        }

        return $result;
    }

    /**
     * Rising vs falling: selected range vs the previous period of the same length (by units sold on completed orders).
     */
    private function risingFallingItems(Carbon $from, Carbon $to): array
    {
        $days = $from->diffInDays($to) + 1;
        $prevFrom = $from->copy()->subDays($days);
        $prevTo = $from->copy()->subDay();

        $thisWeek = OrderItem::query()
            ->select('name')
            ->selectRaw('SUM(quantity) as qty')
            ->whereHas('order', static function ($q) use ($from, $to): void {
                $q->where('status', OrderStatus::Completed)->whereBetween('updated_at', [$from, $to]);
            })
            ->groupBy('name')
            ->get()
            ->keyBy('name');

        $lastWeek = OrderItem::query()
            ->select('name')
            ->selectRaw('SUM(quantity) as qty')
            ->whereHas('order', static function ($q) use ($prevFrom, $prevTo): void {
                $q->where('status', OrderStatus::Completed)->whereBetween('updated_at', [$prevFrom, $prevTo]);
            })
            ->groupBy('name')
            ->get()
            ->keyBy('name');

        $allNames = $thisWeek->keys()->merge($lastWeek->keys())->unique();
        $deltas = [];
        foreach ($allNames as $name) {
            $curr = (int) ($thisWeek->get($name)?->qty ?? 0);
            $prev = (int) ($lastWeek->get($name)?->qty ?? 0);
            $deltas[] = ['name' => $name, 'this_week' => $curr, 'last_week' => $prev, 'delta' => $curr - $prev];
        }
        usort($deltas, static fn ($a, $b) => $b['delta'] <=> $a['delta']);
        $rising = array_slice(array_filter($deltas, static fn ($d) => $d['delta'] > 0), 0, 10);
        $falling = array_slice(array_filter($deltas, static fn ($d) => $d['delta'] < 0), 0, 10);
        usort($falling, static fn ($a, $b) => $a['delta'] <=> $b['delta']);

        $risingCount = count(array_filter($deltas, static fn ($d) => $d['delta'] > 0));
        $fallingCount = count(array_filter($deltas, static fn ($d) => $d['delta'] < 0));
        $flatCount = count(array_filter($deltas, static fn ($d) => $d['delta'] === 0));

        return [
            'rising' => $rising,
            'falling' => $falling,
            'summary' => [
                'items_compared' => count($deltas),
                'rising_count' => $risingCount,
                'falling_count' => $fallingCount,
                'flat_count' => $flatCount,
            ],
        ];
    }

    /** Best item combinations: co-occurrence (same order) from order_items, top pairs by frequency. */
    private function coOccurrencePairs(Carbon $from, Carbon $to): array
    {
        $orderIds = Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$from, $to])
            ->pluck('id');

        if ($orderIds->isEmpty()) {
            return [];
        }

        $orderItems = OrderItem::query()
            ->whereIn('order_id', $orderIds)
            ->get()
            ->groupBy('order_id');

        $pairCounts = [];
        foreach ($orderItems as $orderId => $items) {
            $names = $items->pluck('name')->unique()->filter()->values()->all();
            for ($i = 0; $i < count($names); $i++) {
                for ($j = $i + 1; $j < count($names); $j++) {
                    $a = $names[$i];
                    $b = $names[$j];
                    if ($a === $b) {
                        continue;
                    }
                    $key = $a < $b ? "{$a}|{$b}" : "{$b}|{$a}";
                    $pairCounts[$key] = ($pairCounts[$key] ?? 0) + 1;
                }
            }
        }
        arsort($pairCounts);
        $result = [];
        foreach (array_slice($pairCounts, 0, 15, true) as $key => $count) {
            [$nameA, $nameB] = explode('|', $key, 2);
            $result[] = ['item_a' => $nameA, 'item_b' => $nameB, 'orders' => $count];
        }

        return $result;
    }

    /**
     * 7×24 heatmap: day of week (0–6) × hour (0–23), order count by created_at.
     */
    private function ordersHeatmap(Carbon $from, Carbon $to): array
    {
        $driver = Order::query()->getConnection()->getDriverName();
        if ($driver === 'mysql') {
            $dowSql = '(DAYOFWEEK(created_at) - 1) as dow';
            $hourSql = 'HOUR(created_at) as hour';
        } else {
            $dowSql = 'EXTRACT(DOW FROM created_at)::int as dow';
            $hourSql = 'EXTRACT(HOUR FROM created_at)::int as hour';
        }
        $raw = Order::query()
            ->selectRaw($dowSql)
            ->selectRaw($hourSql)
            ->selectRaw('COUNT(*) as count')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('dow', 'hour')
            ->get();

        $grid = [];
        for ($dow = 0; $dow <= 6; $dow++) {
            for ($hour = 0; $hour <= 23; $hour++) {
                $grid[$dow][$hour] = 0;
            }
        }
        $maxCount = 0;
        foreach ($raw as $row) {
            $dow = (int) $row->dow;
            $hour = (int) $row->hour;
            $cnt = (int) $row->count;
            if ($dow >= 0 && $dow <= 6 && $hour >= 0 && $hour <= 23) {
                $grid[$dow][$hour] = $cnt;
                if ($cnt > $maxCount) {
                    $maxCount = $cnt;
                }
            }
        }

        return ['grid' => $grid, 'max_count' => $maxCount];
    }

    /**
     * Fulfillment speed: received→preparing, preparing→ready, end-to-end (received→completed). From action_log.
     */
    private function fulfillmentSpeedStats(Carbon $from, Carbon $to): array
    {
        $orderIds = Order::query()
            ->where('status', OrderStatus::Completed)
            ->whereBetween('updated_at', [$from, $to])
            ->pluck('id');

        if ($orderIds->isEmpty()) {
            return ['received_to_preparing' => null, 'preparing_to_ready' => null, 'end_to_end' => null];
        }

        $ordersCreatedAt = Order::query()->whereIn('id', $orderIds)->pluck('created_at', 'id');

        $logs = ActionLog::query()
            ->where('model', 'Order')
            ->where('action', 'order_updated')
            ->whereIn('model_id', $orderIds)
            ->orderBy('model_id')
            ->orderBy('created_at')
            ->get(['model_id', 'payload', 'created_at']);

        $byOrder = $logs->groupBy('model_id');
        $durationsReceivedPreparing = [];
        $durationsPreparingReady = [];
        $durationsEndToEnd = [];

        foreach ($orderIds as $oid) {
            $createdAt = $ordersCreatedAt->get($oid);
            if (! $createdAt) {
                continue;
            }
            $createdAt = Carbon::parse($createdAt);
            $orderLogs = $byOrder->get($oid);
            if (! $orderLogs) {
                continue;
            }
            $atPreparing = null;
            $atReady = null;
            $atCompleted = null;
            foreach ($orderLogs as $log) {
                $toStatus = $log->payload['to_status'] ?? null;
                $at = Carbon::parse($log->created_at);
                if ($toStatus === 'preparing' && $atPreparing === null) {
                    $atPreparing = $at;
                }
                if ($toStatus === 'ready' && $atReady === null) {
                    $atReady = $at;
                }
                if ($toStatus === 'completed' && $atCompleted === null) {
                    $atCompleted = $at;
                }
            }
            if ($atPreparing !== null) {
                $durationsReceivedPreparing[] = $createdAt->diffInMinutes($atPreparing);
            }
            if ($atPreparing !== null && $atReady !== null) {
                $durationsPreparingReady[] = $atPreparing->diffInMinutes($atReady);
            }
            if ($atCompleted !== null) {
                $durationsEndToEnd[] = $createdAt->diffInMinutes($atCompleted);
            }
        }

        $avg = static function (array $d): ?float {
            if ($d === []) {
                return null;
            }

            return round(array_sum($d) / count($d), 1);
        };
        $min = static function (array $d): ?int {
            if ($d === []) {
                return null;
            }

            return (int) min($d);
        };
        $max = static function (array $d): ?int {
            if ($d === []) {
                return null;
            }

            return (int) max($d);
        };

        return [
            'received_to_preparing' => [
                'avg_min' => $avg($durationsReceivedPreparing),
                'best_min' => $min($durationsReceivedPreparing),
                'worst_min' => $max($durationsReceivedPreparing),
            ],
            'preparing_to_ready' => [
                'avg_min' => $avg($durationsPreparingReady),
                'best_min' => $min($durationsPreparingReady),
                'worst_min' => $max($durationsPreparingReady),
            ],
            'end_to_end' => [
                'avg_min' => $avg($durationsEndToEnd),
                'best_min' => $min($durationsEndToEnd),
                'worst_min' => $max($durationsEndToEnd),
            ],
        ];
    }

    /**
     * Daily completion rate (completed / orders created that day) for the range.
     */
    private function completionRateByDay(Carbon $from, Carbon $to): array
    {
        $cursor = $from->copy();
        $result = [];
        while ($cursor->lte($to)) {
            $dayStart = $cursor->copy()->startOfDay();
            $dayEnd = $cursor->copy()->endOfDay();
            $created = Order::query()->whereBetween('created_at', [$dayStart, $dayEnd])->count();
            $completed = Order::query()
                ->where('status', OrderStatus::Completed)
                ->whereBetween('updated_at', [$dayStart, $dayEnd])
                ->count();
            $rate = $created > 0 ? round(($completed / $created) * 100, 1) : null;
            $result[] = [
                'date' => $cursor->toDateString(),
                'label' => $cursor->format('M j'),
                'orders' => $created,
                'completed' => $completed,
                'completion_rate' => $rate,
            ];
            $cursor->addDay();
        }

        return $result;
    }

    /**
     * Auto-generated daily/summary report card — string interpolation from data, no AI.
     */
    private function buildReportCard(Carbon $from, Carbon $to, array $data): string
    {
        $fromStr = $from->format('M j, Y');
        $toStr = $to->format('M j, Y');
        $ordersCount = $data['orders_count'] ?? 0;
        $completedCount = $data['completed_count'] ?? 0;
        $revenue = $data['revenue'] ?? 0.0;
        $completionRate = $data['completion_rate'] ?? 0.0;
        $cancelledCount = $data['cancelled_count'] ?? 0;
        $aov = $data['aov'] ?? 0.0;
        $bestDayDate = $data['best_day_date'] ?? null;
        $bestDayRevenue = $data['best_day_revenue'] ?? 0.0;
        $byFulfillment = $data['by_fulfillment'] ?? [];

        $bestDayStr = $bestDayDate
            ? Carbon::parse($bestDayDate)->format('l, M j').' with ₱'.number_format($bestDayRevenue, 2, '.', ',')
            : 'n/a';

        $topFulfillment = '';
        if ($byFulfillment !== []) {
            $top = collect($byFulfillment)->sortByDesc('count')->first();
            if ($top && (int) $top['count'] > 0) {
                $label = ucfirst($top['fulfillment'] ?? '');
                $topFulfillment = " {$label} led with {$top['count']} orders.";
            }
        }

        return sprintf(
            'From %s to %s you had %d orders, %d completed (%.1f%% completion rate), and ₱%s revenue. Average order value was ₱%s. %d orders were cancelled. Best day was %s.%s',
            $fromStr,
            $toStr,
            $ordersCount,
            $completedCount,
            $completionRate,
            number_format($revenue, 2, '.', ','),
            number_format($aov, 2, '.', ','),
            $cancelledCount,
            $bestDayStr,
            $topFulfillment
        );
    }

    private function exportCsv(Carbon $from, Carbon $to): StreamedResponse
    {
        $filename = sprintf('sales-%s-to-%s.csv', $from->format('Y-m-d'), $to->format('Y-m-d'));

        return response()->streamDownload(function () use ($from, $to): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Reference', 'Date', 'Channel', 'Fulfillment', 'Status', 'Total', 'Payment status']);
            Order::query()
                ->whereBetween('created_at', [$from, $to])
                ->orderBy('created_at')
                ->lazy()
                ->each(function (Order $order) use ($handle): void {
                    $fulfillment = $this->fulfillmentType($order);
                    fputcsv($handle, [
                        $order->reference ?? '',
                        $order->created_at?->toDateString() ?? '',
                        $order->channel ?? '',
                        $fulfillment,
                        $order->status ?? '',
                        (string) ($order->total ?? '0'),
                        $order->payment_status ?? 'unpaid',
                    ]);
                });
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
