import { Link } from '@inertiajs/react';
import { ShoppingBag, Truck, Package, Footprints, PlusCircle, Utensils } from 'lucide-react';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, SectionHeading, StatCard } from '../components/ui';
import ChannelPerformanceChart from '../components/dashboard/ChannelPerformanceChart';
import { usePortalRefresh } from '../hooks/usePortalRefresh';
import TopItemsChart from '../components/dashboard/TopItemsChart';

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
    } = overview || {};

    const {
        active_orders_now = 0,
        pipeline_pending = 0,
        pipeline_confirmed = 0,
        pipeline_ready = 0,
        ready_delivery = legacyReadyDelivery,
        ready_pickup = legacyReadyPickup,
    } = realtime || {};

    const {
        by_channel: analyticsByChannel = [],
        top_items: analyticsTopItems = [],
    } = analytics || {};

    const formatCurrency = (amount) => {
        const value = Number.isFinite(amount) ? amount : 0;
        return `₱${value.toFixed(2)}`;
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-surface-600 dark:text-surface-400 max-w-2xl">
                        See how today is going at a glance — live orders, pipeline, and simple performance insights.
                    </p>
                </header>

                {/* Section 1: Today at a glance */}
                <section className="space-y-4">
                    <SectionHeading as="h2" className="text-lg font-bold text-surface-800 dark:text-surface-100">
                        Today at a glance
                    </SectionHeading>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                        <StatCard
                            label="Orders today"
                            value={orders_today}
                            helperText="All orders created today"
                            tone="primary"
                        />
                        <StatCard
                            label="Revenue today"
                            value={formatCurrency(revenue_today)}
                            helperText="Completed orders, updated today"
                        />
                        <StatCard
                            label="Completed today"
                            value={completed_today}
                            helperText="Orders marked completed today"
                            tone="success"
                        />
                        <StatCard
                            label="Active orders now"
                            value={active_orders_now}
                            helperText="Non-completed, non-cancelled"
                        />
                        <StatCard
                            label="Average order value"
                            value={formatCurrency(avg_order_value_today)}
                            helperText="Revenue ÷ completed orders"
                        />
                    </div>
                </section>

                {/* Quick actions */}
                <section className="space-y-3">
                    <SectionHeading as="h2" className="text-lg font-bold text-surface-800 dark:text-surface-100">
                        Quick actions
                    </SectionHeading>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                        Jump straight into the views you use most.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <Link
                            href="/portal/orders"
                            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
                        >
                            <div className="h-full rounded-2xl border border-primary-500/70 bg-surface-50/80 shadow-sm transition hover:shadow-md hover:bg-primary-50/60 dark:border-primary-500/60 dark:bg-surface-900/40 dark:hover:bg-primary-500/10">
                                <div className="flex flex-col gap-3 p-4">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                                        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                                            Orders
                                        </p>
                                        <p className="text-xs text-surface-500 dark:text-surface-400">
                                            Manage all orders in one place.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/portal/deliveries"
                            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                        >
                            <div className="h-full rounded-2xl border border-blue-500/70 bg-surface-50/80 shadow-sm transition hover:shadow-md hover:bg-blue-50/60 dark:border-blue-500/60 dark:bg-surface-900/40 dark:hover:bg-blue-500/10">
                                <div className="flex flex-col gap-3 p-4">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <Truck className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                                            Deliveries
                                        </p>
                                        <p className="text-xs text-surface-500 dark:text-surface-400">
                                            Track orders going out for delivery.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/portal/pickup"
                            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500"
                        >
                            <div className="h-full rounded-2xl border border-amber-500/70 bg-surface-50/80 shadow-sm transition hover:shadow-md hover:bg-amber-50/60 dark:border-amber-500/60 dark:bg-surface-900/40 dark:hover:bg-amber-500/10">
                                <div className="flex flex-col gap-3 p-4">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Package className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                                            Pickup
                                        </p>
                                        <p className="text-xs text-surface-500 dark:text-surface-400">
                                            See orders queued for pickup.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/portal/walkin"
                            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-500"
                        >
                            <div className="h-full rounded-2xl border border-violet-500/70 bg-surface-50/80 shadow-sm transition hover:shadow-md hover:bg-violet-50/60 dark:border-violet-500/60 dark:bg-surface-900/40 dark:hover:bg-violet-500/10">
                                <div className="flex flex-col gap-3 p-4">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                        <Footprints className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                                            Walk-in
                                        </p>
                                        <p className="text-xs text-surface-500 dark:text-surface-400">
                                            Manage guests at the counter.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/portal/quick-orders"
                            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                        >
                            <div className="h-full rounded-2xl border border-emerald-500/70 bg-surface-50/80 shadow-sm transition hover:shadow-md hover:bg-emerald-50/60 dark:border-emerald-500/60 dark:bg-surface-900/40 dark:hover:bg-emerald-500/10">
                                <div className="flex flex-col gap-3 p-4">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <PlusCircle className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                                            Create order
                                        </p>
                                        <p className="text-xs text-surface-500 dark:text-surface-400">
                                            Start a new order quickly.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/portal/menu-items"
                            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-surface-400"
                        >
                            <div className="h-full rounded-2xl border border-surface-300 bg-surface-50/80 shadow-sm transition hover:shadow-md hover:bg-surface-100 dark:border-surface-600 dark:bg-surface-900/40 dark:hover:bg-surface-800">
                                <div className="flex flex-col gap-3 p-4">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-200">
                                        <Utensils className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                                            Menu items
                                        </p>
                                        <p className="text-xs text-surface-500 dark:text-surface-400">
                                            Review and manage your menu.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>

                {/* Section 2: Live operations snapshot */}
                <section className="space-y-4">
                    <SectionHeading as="h2" className="text-lg font-bold text-surface-800 dark:text-surface-100">
                        Live operations
                    </SectionHeading>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40">
                            <CardHeader className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                    Pending
                                </p>
                                <p className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                                    {pipeline_pending}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                    New orders waiting for confirmation.
                                </p>
                                <Link
                                    href="/portal/orders"
                                    className="inline-flex text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                >
                                    View in Orders →
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40">
                            <CardHeader className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                    Confirmed
                                </p>
                                <p className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                                    {pipeline_confirmed}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                    Orders being prepared in the kitchen.
                                </p>
                                <Link
                                    href="/portal/orders"
                                    className="inline-flex text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                >
                                    View in Orders →
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40">
                            <CardHeader className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                    Ready
                                </p>
                                <p className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                                    {pipeline_ready}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                    Orders ready for pickup or on the way for delivery.
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                    Ready delivery: <span className="font-semibold">{ready_delivery}</span> · Ready pickup:{' '}
                                    <span className="font-semibold">{ready_pickup}</span>
                                </p>
                                <Link
                                    href="/portal/orders"
                                    className="inline-flex text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                >
                                    View in Orders →
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Section 3: Today's performance analytics */}
                <section className="space-y-4 pb-4">
                    <SectionHeading as="h2" className="text-lg font-bold text-surface-800 dark:text-surface-100">
                        Today&apos;s performance
                    </SectionHeading>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                                    Orders &amp; revenue by channel
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                    How customers are placing orders today.
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="p-4 border-b border-surface-100 dark:border-surface-800">
                                    <ChannelPerformanceChart data={analyticsByChannel} formatCurrency={formatCurrency} />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-surface-50 dark:bg-surface-900/60">
                                            <tr className="border-b border-surface-200 dark:border-surface-700">
                                                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                                    Channel
                                                </th>
                                                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                                    Orders today
                                                </th>
                                                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                                    Completed
                                                </th>
                                                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                                    Revenue (₱)
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsByChannel.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={4}
                                                        className="px-4 py-6 text-xs text-surface-500 dark:text-surface-400 text-center"
                                                    >
                                                        No orders yet today.
                                                    </td>
                                                </tr>
                                            ) : (
                                                analyticsByChannel.map((row) => (
                                                    <tr
                                                        key={row.channel ?? 'unknown'}
                                                        className="border-b last:border-b-0 border-surface-100 dark:border-surface-800"
                                                    >
                                                        <td className="px-4 py-2 text-sm font-medium text-surface-800 dark:text-surface-100">
                                                            {row.channel || 'Unknown'}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-surface-700 dark:text-surface-200">
                                                            {row.orders_today ?? 0}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-surface-700 dark:text-surface-200">
                                                            {row.completed_today ?? 0}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-surface-700 dark:text-surface-200">
                                                            {formatCurrency(Number(row.revenue_today ?? 0))}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                            <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40">
                                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                                    Top items today
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                    Based on completed orders created today.
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="p-4 border-b border-surface-100 dark:border-surface-800">
                                    <TopItemsChart data={analyticsTopItems} formatCurrency={formatCurrency} />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-surface-50 dark:bg-surface-900/60">
                                            <tr className="border-b border-surface-200 dark:border-surface-700">
                                                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                                    Item
                                                </th>
                                                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                                    Qty sold
                                                </th>
                                                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                                    Revenue (₱)
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsTopItems.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-4 py-6 text-xs text-surface-500 dark:text-surface-400 text-center"
                                                    >
                                                        No completed orders yet today.
                                                    </td>
                                                </tr>
                                            ) : (
                                                analyticsTopItems.map((row) => (
                                                    <tr
                                                        key={row.name ?? 'unknown'}
                                                        className="border-b last:border-b-0 border-surface-100 dark:border-surface-800"
                                                    >
                                                        <td className="px-4 py-2 text-sm font-medium text-surface-800 dark:text-surface-100">
                                                            {row.name || 'Unknown item'}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-surface-700 dark:text-surface-200">
                                                            {row.total_qty ?? 0}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-surface-700 dark:text-surface-200">
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
                    </div>
                </section>
            </section>
        </PortalLayout>
    );
}
