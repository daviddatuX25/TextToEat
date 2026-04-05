import { Link } from '@inertiajs/react';
import { Truck, Store, UtensilsCrossed, ArrowRight } from 'lucide-react';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, PageHeader, SectionHeading, StatCard } from '../components/ui';
import { usePortalRefresh } from '../hooks/usePortalRefresh';
import TopItemsChart from '../components/dashboard/TopItemsChart';
import RevenueChart from '../components/dashboard/RevenueChart';
import { formatCurrency } from '../utils/formatNumber';

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
        pipeline_preparing = 0,
        pipeline_ready = 0,
        ready_delivery = legacyReadyDelivery,
        ready_pickup = legacyReadyPickup,
    } = realtime || {};

    const {
        by_fulfillment: analyticsByFulfillment = [],
        top_items: analyticsTopItems = [],
        revenue_by_hour: revenueByHour = [],
    } = analytics || {};

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
            <div className="pointer-events-none fixed inset-0 z-0 flex justify-center opacity-40 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-primary-300/40 dark:bg-primary-600/20 blur-[120px]" />
                <div className="absolute top-[40%] right-[0%] w-[600px] h-[600px] rounded-full bg-orange-300/30 dark:bg-orange-800/20 blur-[100px]" />
            </div>

            <section className="relative z-10 flex flex-col gap-8 animate-fade-in">
                <PageHeader
                    title="Dashboard"
                    description="Today's operations and performance — data refreshes every 15s."
                />

                {/* Grid: Today's sales (wider min for revenue digits) | Revenue chart */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(22rem,28rem)_1fr] lg:gap-6">
                    {/* Row 1 — Today's sales | Revenue chart */}
                    <Card className="rounded-2xl border-primary-200/60 dark:border-primary-800/40 bg-white/60 dark:bg-surface-900/60 backdrop-blur-md overflow-hidden lg:row-span-1 min-w-0 shadow-sm">
                        <CardHeader className="border-b border-primary-100 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-900/20 pb-3">
                            <p className="text-sm font-bold text-primary-900 dark:text-primary-100">
                                Today&apos;s sales
                            </p>
                        </CardHeader>
                        <CardContent className="px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                                    label="In progress"
                                    value={active_orders_now}
                                    helperText="Pending + Preparing + Ready"
                                    className="!p-3"
                                />
                                <StatCard
                                    label="Average Spend per Order"
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
                    <Card className="rounded-2xl border-primary-200/60 dark:border-primary-800/40 bg-white/60 dark:bg-surface-900/60 backdrop-blur-md overflow-hidden flex flex-col min-h-[360px] min-w-0 shadow-sm">
                        <CardHeader className="border-b border-primary-100 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-900/20 shrink-0">
                            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                                Revenue by Hour
                            </p>
                            <p className="text-xs text-primary-700/80 dark:text-primary-200/60 mt-1">
                                By hour today — Walk-in · Delivery · Pickup (completed orders).
                            </p>
                        </CardHeader>
                        <CardContent className="px-4 pt-5 pb-4 flex-1 min-h-0 flex flex-col">
                            <RevenueChart
                                revenueByHour={revenueByHour}
                                formatCurrency={formatCurrency}
                                className="flex-1 min-h-[300px]"
                            />
                        </CardContent>
                    </Card>

                    {/* Row 2 — Top items (1 col when fulfillment exists, else full width) | Fulfillment (1) */}
                    <Card
                        className={`rounded-2xl border-primary-200/60 dark:border-primary-800/40 bg-white/60 dark:bg-surface-900/60 backdrop-blur-md overflow-hidden shadow-sm ${Array.isArray(analyticsByFulfillment) && analyticsByFulfillment.length > 0 ? 'lg:col-span-1' : 'lg:col-span-2'}`}
                    >
                        <CardHeader className="border-b border-primary-100 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-900/20">
                            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                                Top items today
                            </p>
                            <p className="text-xs text-primary-700/80 dark:text-primary-200/60 mt-1">
                                By quantity sold.
                            </p>
                        </CardHeader>
                        <CardContent className="p-0 pt-4">
                            <div className="p-4 border-b border-primary-100 dark:border-primary-800/40 min-h-[200px]">
                                <TopItemsChart data={analyticsTopItems} formatCurrency={formatCurrency} maxItems={5} />
                            </div>
                            <div className="overflow-x-auto max-h-[200px] overflow-y-auto w-full no-scrollbar">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-primary-50/80 dark:bg-primary-900/40 sticky top-0 backdrop-blur-sm z-10">
                                        <tr className="border-b border-primary-200/60 dark:border-primary-800/50">
                                            <th className="px-4 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300">
                                                Item
                                            </th>
                                            <th className="px-4 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 text-right">
                                                Qty
                                            </th>
                                            <th className="px-4 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 text-right">
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
                                                <tr key={row.name ?? 'unknown'} className="border-b last:border-b-0 border-primary-100/60 dark:border-primary-800/30 hover:bg-primary-50/40 dark:hover:bg-primary-900/20 transition-colors">
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
                        <div className="flex flex-col gap-4 z-10 relative">
                            <Card className="rounded-2xl border-primary-200/60 dark:border-primary-800/40 bg-white/60 dark:bg-surface-900/60 backdrop-blur-md overflow-hidden shadow-sm">
                                <CardHeader className="border-b border-primary-100 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-900/20">
                                    <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                                        Today by fulfillment
                                    </p>
                                    <p className="text-xs text-primary-700/80 dark:text-primary-200/60 mt-1">
                                        Delivery · Pickup · Walk-in
                                    </p>
                                </CardHeader>
                                <CardContent className="p-0 pt-4">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-primary-50/80 dark:bg-primary-900/40 backdrop-blur-sm">
                                            <tr className="border-b border-primary-200/60 dark:border-primary-800/50">
                                                <th className="px-3 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300">Type</th>
                                                <th className="px-3 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 text-right">Orders</th>
                                                <th className="px-3 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 text-right">Done</th>
                                                <th className="px-3 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsByFulfillment.map((row) => (
                                                <tr key={row.type ?? 'unknown'} className="border-b last:border-b-0 border-primary-100/60 dark:border-primary-800/30 hover:bg-primary-50/40 dark:hover:bg-primary-900/20 transition-colors">
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
                                    href="/portal/orders?section=pending"
                                    className="group block rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 p-4 transition hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Pending</p>
                                    <p className="mt-1 text-2xl font-extrabold text-surface-900 dark:text-white">{pipeline_pending}</p>
                                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">Awaiting confirmation</p>
                                </Link>
                                <Link
                                    href="/portal/orders?section=preparing"
                                    className="group block rounded-2xl border border-primary-200 dark:border-primary-800/60 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm p-4 transition hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">Preparing</p>
                                    <p className="mt-1 text-2xl font-extrabold text-surface-900 dark:text-white">{pipeline_preparing}</p>
                                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">In kitchen</p>
                                </Link>
                                <Link
                                    href="/portal/orders?section=ready"
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
                                href="/portal/orders?section=pending"
                                className="group block rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 p-5 transition hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Pending</p>
                                <p className="mt-1 text-3xl font-extrabold text-surface-900 dark:text-white">{pipeline_pending}</p>
                                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">Awaiting confirmation</p>
                                <ArrowRight className="mt-2 h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 transition" aria-hidden />
                            </Link>
                            <Link
                                href="/portal/orders?section=preparing"
                                className="group block rounded-2xl border border-primary-200 dark:border-primary-800/60 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm p-5 transition hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">Preparing</p>
                                <p className="mt-1 text-3xl font-extrabold text-surface-900 dark:text-white">{pipeline_preparing}</p>
                                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">In kitchen</p>
                                <ArrowRight className="mt-2 h-4 w-4 text-primary-500 opacity-0 group-hover:opacity-100 transition" aria-hidden />
                            </Link>
                            <Link
                                href="/portal/orders?section=ready"
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
