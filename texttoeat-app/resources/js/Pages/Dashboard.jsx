import { Link } from '@inertiajs/react';
import { Truck, Store, UtensilsCrossed, ArrowRight } from 'lucide-react';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, SectionHeading, StatCard } from '../components/ui';
import { usePortalRefresh } from '../hooks/usePortalRefresh';
import TopItemsChart from '../components/dashboard/TopItemsChart';
import RevenueChart from '../components/dashboard/RevenueChart';

export default function Dashboard({ metrics = {} }) {
    usePortalRefresh(true, 15000);
    const {
        overview = {},
        realtime = {},
        analytics = {},
        orders_today: legacyOrdersToday = 0,
        ready_delivery: legacyReadyDelivery = 0,
        ready_pickup: legacyReadyPickup = 0,
        completed_today: legacyCompletedToday = 0,
    } = metrics || {};

    const {
        orders_today = legacyOrdersToday,
        completed_today = legacyCompletedToday,
        revenue_today = 0,
        avg_order_value_today = 0,
        completion_rate_today = 0,
        cancelled_today = 0,
        orders_yesterday = 0,
        revenue_yesterday = 0,
    } = overview || {};

    const {
        active_orders_now = 0,
        active_delivery = 0,
        active_pickup = 0,
        active_walkin = 0,
        pipeline_pending = 0,
        pipeline_confirmed = 0,
        pipeline_ready = 0,
        ready_delivery = legacyReadyDelivery,
        ready_pickup = legacyReadyPickup,
    } = realtime || {};

    const {
        by_fulfillment: analyticsByFulfillment = [],
        top_items: analyticsTopItems = [],
        revenue_weekly: revenueWeekly = [],
        revenue_monthly: revenueMonthly = [],
    } = analytics || {};

    const formatCurrency = (amount) => {
        const value = Number.isFinite(amount) ? amount : 0;
        return `₱${value.toFixed(2)}`;
    };

    const ordersVsYesterday =
        orders_yesterday > 0
            ? Math.round(((orders_today - orders_yesterday) / orders_yesterday) * 100)
            : null;
    const revenueVsYesterday =
        revenue_yesterday > 0
            ? Math.round(((revenue_today - revenue_yesterday) / revenue_yesterday) * 100)
            : null;

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-surface-600 dark:text-surface-400 max-w-2xl">
                        Live operations and today&apos;s performance — data refreshes every 15s.
                    </p>
                </header>

                {/* Grid: 3 columns, mixed 1- and 2-column spans */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                    {/* Row 1 — Today's sales (1 col) | Revenue chart (span 2) */}
                    <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 overflow-hidden lg:row-span-1">
                        <CardHeader className="border-b border-surface-200/80 dark:border-surface-700/80 pb-3">
                            <p className="text-sm font-bold text-surface-800 dark:text-surface-100">
                                Today&apos;s sales
                            </p>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <StatCard
                                    label="Orders"
                                    value={orders_today}
                                    trend={ordersVsYesterday}
                                    helperText={orders_yesterday > 0 ? `Yesterday ${orders_yesterday}` : undefined}
                                    tone="primary"
                                    className="!p-3"
                                />
                                <StatCard
                                    label="Revenue"
                                    value={formatCurrency(revenue_today)}
                                    trend={revenueVsYesterday}
                                    helperText={revenue_yesterday > 0 ? formatCurrency(revenue_yesterday) : undefined}
                                    className="!p-3"
                                />
                                <StatCard
                                    label="Completed"
                                    value={completed_today}
                                    subValue={orders_today > 0 ? `${completion_rate_today}%` : undefined}
                                    helperText="Today"
                                    tone="success"
                                    className="!p-3"
                                />
                                <StatCard
                                    label="Active now"
                                    value={active_orders_now}
                                    helperText={active_orders_now === 0 ? 'None in progress' : `${active_orders_now} in progress`}
                                    className="!p-3"
                                />
                                <StatCard
                                    label="Average order value"
                                    value={formatCurrency(avg_order_value_today)}
                                    helperText="Revenue ÷ completed"
                                    className="!p-3 col-span-2"
                                />
                                <StatCard
                                    label="Cancelled"
                                    value={cancelled_today}
                                    tone={cancelled_today > 0 ? 'warning' : 'default'}
                                    className="!p-3 col-span-2"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue by type: chart fills card (Walk-in, Delivery, Pickup) */}
                    <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden lg:col-span-2 flex flex-col min-h-[360px]">
                        <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40 shrink-0">
                            <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                                Revenue by type
                            </p>
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                Walk-in · Delivery · Pickup (completed orders).
                            </p>
                        </CardHeader>
                        <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
                            <RevenueChart
                                revenueWeekly={revenueWeekly}
                                revenueMonthly={revenueMonthly}
                                formatCurrency={formatCurrency}
                                className="flex-1 min-h-[300px]"
                            />
                        </CardContent>
                    </Card>

                    {/* Row 2 — Top items (span 2 when fulfillment exists, else 3) | Fulfillment (1) */}
                    <Card
                        className={`rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden ${Array.isArray(analyticsByFulfillment) && analyticsByFulfillment.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}
                    >
                        <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                            <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                                Top items today
                            </p>
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                By quantity sold.
                            </p>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 border-b border-surface-100 dark:border-surface-800 min-h-[200px]">
                                <TopItemsChart data={analyticsTopItems} formatCurrency={formatCurrency} maxItems={5} />
                            </div>
                            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-surface-50 dark:bg-surface-900/60 sticky top-0">
                                        <tr className="border-b border-surface-200 dark:border-surface-700">
                                            <th className="px-4 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400">
                                                Item
                                            </th>
                                            <th className="px-4 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400 text-right">
                                                Qty
                                            </th>
                                            <th className="px-4 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400 text-right">
                                                Revenue
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analyticsTopItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-6 text-xs text-surface-500 dark:text-surface-400 text-center">
                                                    No data yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            analyticsTopItems.map((row) => (
                                                <tr key={row.name ?? 'unknown'} className="border-b last:border-b-0 border-surface-100 dark:border-surface-800">
                                                    <td className="px-4 py-2 font-medium text-surface-800 dark:text-surface-100" title={row.name}>
                                                        {row.name || '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">
                                                        {row.total_qty ?? 0}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-surface-700 dark:text-surface-200">
                                                        {formatCurrency(Number(row.total_revenue ?? 0))}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {Array.isArray(analyticsByFulfillment) && analyticsByFulfillment.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                                <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                                        Today by fulfillment
                                    </p>
                                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                        Delivery · Pickup · Walk-in
                                    </p>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-surface-50 dark:bg-surface-900/60">
                                            <tr className="border-b border-surface-200 dark:border-surface-700">
                                                <th className="px-3 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400">Type</th>
                                                <th className="px-3 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400 text-right">Orders</th>
                                                <th className="px-3 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400 text-right">Done</th>
                                                <th className="px-3 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400 text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsByFulfillment.map((row) => (
                                                <tr key={row.type ?? 'unknown'} className="border-b last:border-b-0 border-surface-100 dark:border-surface-800">
                                                    <td className="px-3 py-2 font-medium text-surface-800 dark:text-surface-100">
                                                        {row.type === 'delivery' && <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-primary-500" /> Delivery</span>}
                                                        {row.type === 'pickup' && <span className="inline-flex items-center gap-1"><Store className="h-3.5 w-3.5 text-amber-500" /> Pickup</span>}
                                                        {row.type === 'walkin' && <span className="inline-flex items-center gap-1"><UtensilsCrossed className="h-3.5 w-3.5 text-violet-500" /> Walk-in</span>}
                                                        {row.type !== 'delivery' && row.type !== 'pickup' && row.type !== 'walkin' && (row.type || '—')}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-surface-700 dark:text-surface-200">{row.orders_today ?? 0}</td>
                                                    <td className="px-3 py-2 text-right text-surface-700 dark:text-surface-200">{row.completed_today ?? 0}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-surface-800 dark:text-surface-100">{formatCurrency(Number(row.revenue_today ?? 0))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                            <div className="grid grid-cols-3 gap-3">
                                <Link
                                    href="/portal/orders"
                                    className="group block rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 p-4 transition hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Pending</p>
                                    <p className="mt-1 text-2xl font-extrabold text-surface-900 dark:text-white">{pipeline_pending}</p>
                                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">Awaiting confirmation</p>
                                </Link>
                                <Link
                                    href="/portal/orders"
                                    className="group block rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40 p-4 transition hover:border-surface-300 dark:hover:border-surface-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">Confirmed</p>
                                    <p className="mt-1 text-2xl font-extrabold text-surface-900 dark:text-white">{pipeline_confirmed}</p>
                                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">In kitchen</p>
                                </Link>
                                <Link
                                    href="/portal/orders"
                                    className="group block rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Ready</p>
                                    <p className="mt-1 text-2xl font-extrabold text-surface-900 dark:text-white">{pipeline_ready}</p>
                                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">Ready for handoff</p>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Link
                                href="/portal/orders"
                                className="group block rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 p-5 transition hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Pending</p>
                                <p className="mt-1 text-3xl font-extrabold text-surface-900 dark:text-white">{pipeline_pending}</p>
                                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">Awaiting confirmation</p>
                                <ArrowRight className="mt-2 h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 transition" aria-hidden />
                            </Link>
                            <Link
                                href="/portal/orders"
                                className="group block rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40 p-5 transition hover:border-surface-300 dark:hover:border-surface-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">Confirmed</p>
                                <p className="mt-1 text-3xl font-extrabold text-surface-900 dark:text-white">{pipeline_confirmed}</p>
                                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">In kitchen</p>
                                <ArrowRight className="mt-2 h-4 w-4 text-primary-500 opacity-0 group-hover:opacity-100 transition" aria-hidden />
                            </Link>
                            <Link
                                href="/portal/orders"
                                className="group block rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Ready</p>
                                <p className="mt-1 text-3xl font-extrabold text-surface-900 dark:text-white">{pipeline_ready}</p>
                                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">Ready for handoff</p>
                                <ArrowRight className="mt-2 h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition" aria-hidden />
                            </Link>
                        </>
                    )}
                </div>
            </section>
        </PortalLayout>
    );
}
