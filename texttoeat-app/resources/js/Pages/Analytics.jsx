import { useState, Fragment } from 'react';
import { router } from '@inertiajs/react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, PageHeader, Button, TooltipProvider, InfoTooltip } from '../components/ui';
import PortalLayout from '../Layouts/PortalLayout';
import { formatCurrency } from '../utils/formatNumber';
import { TrendingUp, TrendingDown, Download, BarChart3, UtensilsCrossed, Activity, ArrowUpCircle, ArrowDownCircle, Link2 } from 'lucide-react';

const TAB_SALES = 'sales';
const TAB_MENU = 'menu';
const TAB_OPS = 'ops';

const CHANNEL_LABELS = { sms: 'SMS', messenger: 'Messenger', web: 'Web', walkin: 'Walk-in' };
const FULFILLMENT_LABELS = { walkin: 'Walk-in', delivery: 'Delivery', pickup: 'Pickup' };
const CHART_COLORS = { walkin: '#8b5cf6', delivery: '#f97316', pickup: '#f59e0b' };
const PIE_COLORS = ['#8b5cf6', '#f97316', '#f59e0b', '#10b981'];

export default function Analytics({
    date_from = '',
    date_to = '',
    sales = {},
    menu_intelligence = {},
    operations = {},
}) {
    const [activeTab, setActiveTab] = useState(TAB_SALES);
    const [dateFrom, setDateFrom] = useState(date_from);
    const [dateTo, setDateTo] = useState(date_to);

    const applyDateRange = () => {
        router.get('/portal/analytics', { date_from: dateFrom || undefined, date_to: dateTo || undefined }, { preserveState: true });
    };

    const leaderboard = menu_intelligence?.leaderboard ?? [];
    const risingFalling = menu_intelligence?.rising_falling ?? { rising: [], falling: [] };
    const coOccurrence = menu_intelligence?.co_occurrence ?? [];
    const heatmap = operations?.heatmap ?? { grid: {}, max_count: 0 };
    const fulfillmentSpeed = operations?.fulfillment_speed ?? {};
    const completionRateByDay = operations?.completion_rate_by_day ?? [];
    const reportCard = operations?.report_card ?? '';

    const {
        revenue = 0,
        revenue_change_percent = null,
        orders_count = 0,
        completed_count = 0,
        cancelled_count = 0,
        aov = 0,
        completion_rate = 0,
        best_day_date = null,
        best_day_revenue = 0,
        revenue_by_day = [],
        by_channel = [],
        by_fulfillment = [],
        payment_health = { paid: 0, unpaid: 0, total_completed: 0 },
        period_days = null,
        prev_from = null,
        prev_to = null,
    } = sales;

    const formatShortDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
    const previousPeriodTooltipContent =
        period_days != null && prev_from != null && prev_to != null
            ? `Compared to the same number of days right before your selected range. For this range we compare to the previous ${Math.round(Number(period_days))} days (${formatShortDate(prev_from)} to ${formatShortDate(prev_to)}).`
            : 'Compared to the same number of days right before your selected range. For example, if you select 3 days, we compare to the 3 days immediately before that.';

    const revenueByDayChart = revenue_by_day.map((d) => ({
        ...d,
        walkin: Number(d.walkin ?? 0),
        delivery: Number(d.delivery ?? 0),
        pickup: Number(d.pickup ?? 0),
        total: Number(d.walkin ?? 0) + Number(d.delivery ?? 0) + Number(d.pickup ?? 0),
    }));

    const channelDonutData = by_channel.map((r) => ({ name: CHANNEL_LABELS[r.channel] ?? r.channel, value: r.count }));
    const fulfillmentDonutData = by_fulfillment.map((r) => ({ name: FULFILLMENT_LABELS[r.fulfillment] ?? r.fulfillment, value: r.count }));
    const totalOrders = channelDonutData.reduce((s, d) => s + d.value, 0);
    const totalFulfillment = fulfillmentDonutData.reduce((s, d) => s + d.value, 0);

    const exportUrl = `/portal/analytics?export=csv&date_from=${encodeURIComponent(date_from)}&date_to=${encodeURIComponent(date_to)}`;

    return (
        <PortalLayout>
            <TooltipProvider delayDuration={200} skipDelayDuration={300}>
            <section className="flex flex-col gap-6 animate-fade-in">
                <PageHeader
                    title="Analytics & Reports"
                    description="Sales, menu intelligence, and operations — choose a date range to analyze."
                />

                {/* Date range */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40">
                    <CardContent className="flex flex-wrap items-end gap-4 py-4">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">From</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">To</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                            />
                        </label>
                        <Button onClick={applyDateRange}>Apply</Button>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <div className="flex gap-1 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab(TAB_SALES)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === TAB_SALES
                                ? 'bg-white dark:bg-surface-700 shadow text-surface-900 dark:text-surface-100'
                                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
                        }`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        Sales
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab(TAB_MENU)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === TAB_MENU
                                ? 'bg-white dark:bg-surface-700 shadow text-surface-900 dark:text-surface-100'
                                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
                        }`}
                    >
                        <UtensilsCrossed className="h-4 w-4" />
                        Menu Intelligence
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab(TAB_OPS)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === TAB_OPS
                                ? 'bg-white dark:bg-surface-700 shadow text-surface-900 dark:text-surface-100'
                                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
                        }`}
                    >
                        <Activity className="h-4 w-4" />
                        Operations
                    </button>
                </div>

                {/* Tab 1: Sales */}
                {activeTab === TAB_SALES && (
                    <div className="space-y-6">
                        {/* Hero revenue + period-over-period */}
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardContent className="pt-6 pb-4">
                                <p className="text-sm font-semibold text-surface-500 dark:text-surface-400">Total revenue</p>
                                <div className="mt-1 flex items-baseline gap-3">
                                    <span className="text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                                        {formatCurrency(revenue)}
                                    </span>
                                    {revenue_change_percent != null && (
                                        <span
                                            className={`flex items-center gap-1.5 text-sm font-medium ${
                                                revenue_change_percent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                            }`}
                                        >
                                            {revenue_change_percent >= 0 ? <TrendingUp className="h-4 w-4 mr-0.5" /> : <TrendingDown className="h-4 w-4 mr-0.5" />}
                                            {revenue_change_percent >= 0 ? '+' : ''}{revenue_change_percent}% vs previous period
                                            <InfoTooltip content={previousPeriodTooltipContent} side="bottom" />
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Snapshot row */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                <CardContent className="py-4">
                                    <p className="text-xs font-semibold text-surface-500 dark:text-surface-400">Orders</p>
                                    <p className="text-2xl font-extrabold text-surface-900 dark:text-white">{orders_count}</p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                <CardContent className="py-4">
                                    <p className="text-xs font-semibold text-surface-500 dark:text-surface-400">Completed</p>
                                    <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{completed_count}</p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                <CardContent className="py-4">
                                    <p className="text-xs font-semibold text-surface-500 dark:text-surface-400">Cancelled</p>
                                    <p className="text-2xl font-extrabold text-surface-900 dark:text-white">{cancelled_count}</p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                <CardContent className="py-4">
                                    <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 flex items-center gap-1.5">
                                        Avg order value
                                        <InfoTooltip
                                            content="Average order value: total revenue from completed orders divided by the number of completed orders. It's the average amount spent per order in this period."
                                            side="top"
                                        />
                                    </p>
                                    <p className="text-2xl font-extrabold text-surface-900 dark:text-white">{formatCurrency(aov)}</p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                <CardContent className="py-4">
                                    <p className="text-xs font-semibold text-surface-500 dark:text-surface-400">Best day</p>
                                    <p className="text-lg font-extrabold text-surface-900 dark:text-white">
                                        {best_day_date ? (
                                            <>
                                                {new Date(best_day_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                <span className="block text-sm font-normal text-surface-500 dark:text-surface-400">{formatCurrency(best_day_revenue)}</span>
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Stacked area: revenue by day */}
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Revenue by day</p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Walk-in · Delivery · Pickup (completed orders)</p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="h-[320px] w-full">
                                    {revenueByDayChart.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={revenueByDayChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                                <defs>
                                                    <linearGradient id="areaWalkin" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={CHART_COLORS.walkin} stopOpacity={0.6} />
                                                        <stop offset="100%" stopColor={CHART_COLORS.walkin} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="areaDelivery" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={CHART_COLORS.delivery} stopOpacity={0.6} />
                                                        <stop offset="100%" stopColor={CHART_COLORS.delivery} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="areaPickup" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={CHART_COLORS.pickup} stopOpacity={0.6} />
                                                        <stop offset="100%" stopColor={CHART_COLORS.pickup} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                                <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    formatter={(value) => formatCurrency(value)}
                                                    content={({ active, payload, label }) => {
                                                        if (!active || !payload?.length) return null;
                                                        return (
                                                            <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-md dark:border-surface-700 dark:bg-surface-800">
                                                                <p className="text-xs font-semibold text-surface-800 dark:text-surface-100">{label}</p>
                                                                <ul className="mt-1 space-y-0.5 text-xs text-surface-600 dark:text-surface-300">
                                                                    {payload.map((p) => (
                                                                        <li key={p.dataKey}>{p.name}: {formatCurrency(p.value)}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <Legend />
                                                <Area type="monotone" dataKey="walkin" name="Walk-in" stackId="1" stroke={CHART_COLORS.walkin} fill="url(#areaWalkin)" strokeWidth={1.5} />
                                                <Area type="monotone" dataKey="delivery" name="Delivery" stackId="1" stroke={CHART_COLORS.delivery} fill="url(#areaDelivery)" strokeWidth={1.5} />
                                                <Area type="monotone" dataKey="pickup" name="Pickup" stackId="1" stroke={CHART_COLORS.pickup} fill="url(#areaPickup)" strokeWidth={1.5} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-surface-500 dark:text-surface-400">No revenue data for this range.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Two donuts + Payment health + Export */}
                        <div className="grid gap-6 lg:grid-cols-3">
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                                <CardHeader className="border-b border-surface-200 dark:border-surface-700 pb-2">
                                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Orders by channel</p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {channelDonutData.length > 0 && totalOrders > 0 ? (
                                        <div className="h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={channelDonutData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={2}
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    >
                                                        {channelDonutData.map((_, i) => (
                                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => [value, 'Orders']} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="flex h-[220px] items-center justify-center text-sm text-surface-500 dark:text-surface-400">No orders in range.</div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                                <CardHeader className="border-b border-surface-200 dark:border-surface-700 pb-2">
                                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Orders by fulfillment</p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {fulfillmentDonutData.length > 0 && totalFulfillment > 0 ? (
                                        <div className="h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={fulfillmentDonutData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={2}
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    >
                                                        {fulfillmentDonutData.map((_, i) => (
                                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => [value, 'Orders']} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="flex h-[220px] items-center justify-center text-sm text-surface-500 dark:text-surface-400">No orders in range.</div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                                <CardHeader className="border-b border-surface-200 dark:border-surface-700 pb-2">
                                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Payment health</p>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                                            <span>Paid</span>
                                            <span>{payment_health.paid} of {payment_health.total_completed}</span>
                                        </div>
                                        <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 dark:bg-emerald-600 transition-all"
                                                style={{
                                                    width: payment_health.total_completed > 0 ? `${(payment_health.paid / payment_health.total_completed) * 100}%` : '0%',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                                            <span>Unpaid (completed)</span>
                                            <span>{payment_health.unpaid}</span>
                                        </div>
                                        <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-amber-500 dark:bg-amber-600 transition-all"
                                                style={{
                                                    width: payment_health.total_completed > 0 ? `${(payment_health.unpaid / payment_health.total_completed) * 100}%` : '0%',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <a
                                        href={exportUrl}
                                        className="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export sales (CSV)
                                    </a>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Tab 2: Menu Intelligence */}
                {activeTab === TAB_MENU && (
                    <div className="space-y-6">
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Item leaderboard</p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                    Units sold and revenue in selected range. Sell-through appears when daily stock is set for items.
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-surface-50 dark:bg-surface-900/60">
                                            <tr className="border-b border-surface-200 dark:border-surface-700">
                                                <th className="px-4 py-3 font-semibold text-surface-500 dark:text-surface-400">Item</th>
                                                <th className="px-4 py-3 font-semibold text-surface-500 dark:text-surface-400 text-right">Units</th>
                                                <th className="px-4 py-3 font-semibold text-surface-500 dark:text-surface-400 text-right">Revenue</th>
                                                <th className="px-4 py-3 font-semibold text-surface-500 dark:text-surface-400 text-right">
                                                    Sell-through
                                                    <span className="block font-normal text-surface-400 dark:text-surface-500 text-xs mt-0.5">When daily stock is set</span>
                                                </th>
                                                <th className="px-4 py-3 font-semibold text-surface-500 dark:text-surface-400 text-right">Trend</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-surface-500 dark:text-surface-400">
                                                        No completed orders in this range.
                                                    </td>
                                                </tr>
                                            ) : (
                                                leaderboard.map((row) => (
                                                    <tr key={row.name} className="border-b last:border-b-0 border-surface-100 dark:border-surface-800">
                                                        <td className="px-4 py-2 font-medium text-surface-800 dark:text-surface-100">{row.name || '—'}</td>
                                                        <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">{row.units_sold ?? 0}</td>
                                                        <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">{formatCurrency(Number(row.revenue ?? 0))}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            {row.sell_through_pct != null ? (
                                                                <span
                                                                    className={
                                                                        row.sell_through_pct >= 80
                                                                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                                                            : row.sell_through_pct >= 50
                                                                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                                                                              : 'text-rose-600 dark:text-rose-400 font-medium'
                                                                    }
                                                                >
                                                                    {row.sell_through_pct}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-surface-400 dark:text-surface-500 italic" title="Daily stock not set for this item in this period">
                                                                    No stock data
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            {row.trend != null ? (
                                                                <span className={row.trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                                                    {row.trend >= 0 ? '+' : ''}{row.trend}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-surface-400 dark:text-surface-500">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                                <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
                                        <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                                        Rising this period
                                    </p>
                                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 flex items-center gap-1.5">
                                        Vs previous period of same length
                                        <InfoTooltip content={previousPeriodTooltipContent} side="top" />
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {risingFalling.rising?.length > 0 ? (
                                        <ul className="space-y-2">
                                            {risingFalling.rising.map((r) => (
                                                <li key={r.name} className="flex justify-between text-sm">
                                                    <span className="font-medium text-surface-800 dark:text-surface-100">{r.name}</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400">+{r.delta} units</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-surface-500 dark:text-surface-400">No rising items.</p>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                                <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
                                        <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                                        Falling this period
                                    </p>
                                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 flex items-center gap-1.5">
                                        Vs previous period of same length
                                        <InfoTooltip content={previousPeriodTooltipContent} side="top" />
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {risingFalling.falling?.length > 0 ? (
                                        <ul className="space-y-2">
                                            {risingFalling.falling.map((r) => (
                                                <li key={r.name} className="flex justify-between text-sm">
                                                    <span className="font-medium text-surface-800 dark:text-surface-100">{r.name}</span>
                                                    <span className="text-rose-600 dark:text-rose-400">{r.delta} units</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-surface-500 dark:text-surface-400">No falling items.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-primary-500" />
                                    Best item combinations
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Items often ordered together (same order)</p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {coOccurrence.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="text-surface-500 dark:text-surface-400">
                                                <tr className="border-b border-surface-200 dark:border-surface-700">
                                                    <th className="px-4 py-2 text-left font-semibold">Item A</th>
                                                    <th className="px-4 py-2 text-left font-semibold">Item B</th>
                                                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {coOccurrence.map((pair, i) => (
                                                    <tr key={i} className="border-b last:border-b-0 border-surface-100 dark:border-surface-800">
                                                        <td className="px-4 py-2 text-surface-800 dark:text-surface-100">{pair.item_a}</td>
                                                        <td className="px-4 py-2 text-surface-800 dark:text-surface-100">{pair.item_b}</td>
                                                        <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">{pair.orders}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-surface-500 dark:text-surface-400">No combination data in this range.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tab 3: Operations */}
                {activeTab === TAB_OPS && (
                    <div className="space-y-6">
                        {reportCard && (
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                                <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Summary report</p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <p className="text-sm text-surface-700 dark:text-surface-200 leading-relaxed">{reportCard}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* 7×24 heatmap */}
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Order volume by day and hour</p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Peak times at a glance (orders created)</p>
                            </CardHeader>
                            <CardContent className="pt-4 overflow-x-auto">
                                <HeatmapGrid heatmap={heatmap} />
                            </CardContent>
                        </Card>

                        {/* Fulfillment speed */}
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Fulfillment speed</p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">From action logs (completed orders in range)</p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <FulfillmentSpeedTable fulfillmentSpeed={fulfillmentSpeed} />
                            </CardContent>
                        </Card>

                        {/* Completion rate line + 90% target */}
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">Completion rate by day</p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">90% target line</p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <CompletionRateChart data={completionRateByDay} />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </section>
            </TooltipProvider>
        </PortalLayout>
    );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HeatmapGrid({ heatmap }) {
    const { grid = {}, max_count: maxCount = 0 } = heatmap;
    const safe = (dow, hour) => (grid[dow] && grid[dow][hour]) ?? 0;
    const opacity = (dow, hour) => (maxCount > 0 ? Math.max(0.15, safe(dow, hour) / maxCount) : 0);
    return (
        <div className="inline-block min-w-0">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))' }}>
                <div className="text-xs font-medium text-surface-500 dark:text-surface-400 py-1 pr-2" />
                {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="text-xs text-surface-500 dark:text-surface-400 text-center py-1">
                        {h}h
                    </div>
                ))}
                {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
                    <Fragment key={dow}>
                        <div className="text-xs font-medium text-surface-600 dark:text-surface-300 py-1 pr-2">{DAY_LABELS[dow]}</div>
                        {Array.from({ length: 24 }, (_, hour) => (
                            <div
                                key={hour}
                                className="w-4 h-4 min-w-[1rem] rounded-sm bg-primary-500 dark:bg-primary-600 transition-opacity"
                                style={{ opacity: opacity(dow, hour) }}
                                title={`${DAY_LABELS[dow]} ${hour}:00 — ${safe(dow, hour)} orders`}
                            />
                        ))}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}

function FulfillmentSpeedTable({ fulfillmentSpeed }) {
    const r2p = fulfillmentSpeed?.received_to_preparing;
    const p2r = fulfillmentSpeed?.preparing_to_ready;
    const e2e = fulfillmentSpeed?.end_to_end;
    const row = (label, data) => (
        <tr className="border-b last:border-b-0 border-surface-100 dark:border-surface-800">
            <td className="px-4 py-2 font-medium text-surface-800 dark:text-surface-100">{label}</td>
            <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">{data?.avg_min != null ? `${data.avg_min} min` : '—'}</td>
            <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">{data?.best_min != null ? `${data.best_min} min` : '—'}</td>
            <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">{data?.worst_min != null ? `${data.worst_min} min` : '—'}</td>
        </tr>
    );
    const hasAny = r2p?.avg_min != null || p2r?.avg_min != null || e2e?.avg_min != null;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="text-surface-500 dark:text-surface-400">
                    <tr className="border-b border-surface-200 dark:border-surface-700">
                        <th className="px-4 py-2 text-left font-semibold">Stage</th>
                        <th className="px-4 py-2 text-right font-semibold">Avg</th>
                        <th className="px-4 py-2 text-right font-semibold">Best</th>
                        <th className="px-4 py-2 text-right font-semibold">Worst</th>
                    </tr>
                </thead>
                <tbody>
                    {row('Received → Preparing', r2p)}
                    {row('Preparing → Ready', p2r)}
                    {row('End-to-end', e2e)}
                </tbody>
            </table>
            {!hasAny && (
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">No transition data in this range (need completed orders with status logs).</p>
            )}
        </div>
    );
}

function CompletionRateChart({ data }) {
    const chartData = (data ?? []).map((d) => ({ ...d, rate: d.completion_rate ?? 0, target: 90 }));
    if (chartData.length === 0) {
        return <div className="h-[240px] flex items-center justify-center text-sm text-surface-500 dark:text-surface-400">No daily data.</div>;
    }
    return (
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value, name) => [name === 'target' ? '90% target' : `${value}%`, name]} labelFormatter={(l) => l} />
                    <Line type="monotone" dataKey="rate" name="Completion rate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="target" name="target" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
