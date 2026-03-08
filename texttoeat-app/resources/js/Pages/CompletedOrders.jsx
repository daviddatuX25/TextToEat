import { useState, useEffect, useCallback } from 'react';
import { Link, router } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { TypewriterText, PaginationLinks } from '../components/ui';
import { OrderListRow } from '../components/staff/OrderListRow';
import { CompletedOrderTableRow } from '../components/staff/CompletedOrderTableRow';
import { LayoutGrid, List, ChevronDown, Search, X, Filter } from 'lucide-react';

const COMPLETED_VIEW_MODE_KEY = 'completedOrdersViewMode';
const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];
const CHANNEL_OPTIONS = [
    { value: 'sms', label: 'SMS' },
    { value: 'messenger', label: 'Messenger' },
    { value: 'web', label: 'Web' },
    { value: 'walkin', label: 'Walk-in' },
];
const SORT_OPTIONS = [
    { value: 'updated_at', label: 'Last updated' },
    { value: 'created_at', label: 'Date created' },
    { value: 'total', label: 'Total amount' },
    { value: 'reference', label: 'Reference' },
];

export default function CompletedOrders({
    orders: ordersProp = [],
    filters: initialFilters = {},
}) {
    const ordersPaginated = ordersProp?.data != null ? ordersProp : null;
    const orders = ordersPaginated ? ordersPaginated.data : (Array.isArray(ordersProp) ? ordersProp : []);
    // Laravel paginator exposes last_page, from, to, total at root (no nested "meta")
    const meta = ordersPaginated
        ? {
            from: ordersPaginated.from,
            to: ordersPaginated.to,
            total: ordersPaginated.total,
            last_page: ordersPaginated.last_page,
        }
        : null;
    const links = ordersPaginated?.links ?? null;
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'card';
        return window.localStorage?.getItem(COMPLETED_VIEW_MODE_KEY) || 'card';
    });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState({
        status: initialFilters.status ?? 'all',
        channel: Array.isArray(initialFilters.channel) ? initialFilters.channel : [],
        date_from: initialFilters.date_from ?? '',
        date_to: initialFilters.date_to ?? '',
        search: initialFilters.search ?? '',
        sort: initialFilters.sort ?? 'updated_at',
        direction: initialFilters.direction ?? 'desc',
    });

    useEffect(() => {
        setLocalFilters((prev) => ({
            ...prev,
            status: initialFilters.status ?? 'all',
            channel: Array.isArray(initialFilters.channel) ? initialFilters.channel : [],
            date_from: initialFilters.date_from ?? '',
            date_to: initialFilters.date_to ?? '',
            search: initialFilters.search ?? '',
            sort: initialFilters.sort ?? 'updated_at',
            direction: initialFilters.direction ?? 'desc',
        }));
    }, [initialFilters]);

    useEffect(() => {
        if (typeof window !== 'undefined' && viewMode) {
            window.localStorage?.setItem(COMPLETED_VIEW_MODE_KEY, viewMode);
        }
    }, [viewMode]);

    const applyFilters = useCallback(() => {
        const params = { page: 1 };
        if (localFilters.status && localFilters.status !== 'all') params.status = localFilters.status;
        if (localFilters.channel?.length) params.channel = localFilters.channel;
        if (localFilters.date_from) params.date_from = localFilters.date_from;
        if (localFilters.date_to) params.date_to = localFilters.date_to;
        if (localFilters.search?.trim()) params.search = localFilters.search.trim();
        if (localFilters.sort) params.sort = localFilters.sort;
        if (localFilters.direction) params.direction = localFilters.direction;
        router.get('/portal/orders/completed', params, { preserveState: true });
        setFiltersOpen(false);
    }, [localFilters]);

    const clearFilters = useCallback(() => {
        setLocalFilters({
            status: 'all',
            channel: [],
            date_from: '',
            date_to: '',
            search: '',
            sort: 'updated_at',
            direction: 'desc',
        });
        router.get('/portal/orders/completed', {}, { preserveState: true });
        setFiltersOpen(false);
    }, []);

    const toggleChannel = (value) => {
        setLocalFilters((prev) => {
            const ch = prev.channel ?? [];
            const next = ch.includes(value) ? ch.filter((c) => c !== value) : [...ch, value];
            return { ...prev, channel: next };
        });
    };

    const activeFilterCount =
        (localFilters.status && localFilters.status !== 'all' ? 1 : 0) +
        (localFilters.channel?.length ? 1 : 0) +
        (localFilters.date_from ? 1 : 0) +
        (localFilters.date_to ? 1 : 0) +
        (localFilters.search?.trim() ? 1 : 0);

    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <header className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                        <i className="ph-bold ph-check-circle"></i>
                        Completed &amp; cancelled
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Completed orders
                        </h1>
                        <Link
                            href="/portal/orders"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 smooth-hover"
                        >
                            ← Back to orders
                        </Link>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        <TypewriterText text="View and search completed or cancelled orders." />
                    </p>
                </header>

                {/* Filters + view toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((o) => !o)}
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                activeFilterCount > 0
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                                    : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
                            }`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-primary-600 text-white text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center px-1">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                            >
                                <X className="h-4 w-4" />
                                Clear filters
                            </button>
                        )}
                    </div>
                    <div
                        className="inline-flex rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-0.5"
                        role="group"
                        aria-label="View mode"
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode('card')}
                            aria-label="Card view"
                            aria-pressed={viewMode === 'card'}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                                viewMode === 'card'
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
                            }`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Card
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            aria-label="Table view"
                            aria-pressed={viewMode === 'table'}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
                            }`}
                        >
                            <List className="h-4 w-4" />
                            Table
                        </button>
                    </div>
                </div>

                {/* Filter panel (collapsible) */}
                {filtersOpen && (
                    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-800/50 p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">Status</label>
                                <select
                                    value={localFilters.status}
                                    onChange={(e) => setLocalFilters((p) => ({ ...p, status: e.target.value }))}
                                    className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    {STATUS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">Date from</label>
                                <input
                                    type="date"
                                    value={localFilters.date_from}
                                    onChange={(e) => setLocalFilters((p) => ({ ...p, date_from: e.target.value }))}
                                    className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">Date to</label>
                                <input
                                    type="date"
                                    value={localFilters.date_to}
                                    onChange={(e) => setLocalFilters((p) => ({ ...p, date_to: e.target.value }))}
                                    className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">Sort by</label>
                                <select
                                    value={localFilters.sort}
                                    onChange={(e) => setLocalFilters((p) => ({ ...p, sort: e.target.value }))}
                                    className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    {SORT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">Order</label>
                                <select
                                    value={localFilters.direction}
                                    onChange={(e) => setLocalFilters((p) => ({ ...p, direction: e.target.value }))}
                                    className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="desc">Newest first</option>
                                    <option value="asc">Oldest first</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">Search (name, phone, reference)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                                    <input
                                        type="text"
                                        value={localFilters.search}
                                        onChange={(e) => setLocalFilters((p) => ({ ...p, search: e.target.value }))}
                                        placeholder="Search…"
                                        className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs font-semibold text-surface-600 dark:text-surface-400 self-center">Channel</span>
                                {CHANNEL_OPTIONS.map((o) => (
                                    <label key={o.value} className="inline-flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(localFilters.channel ?? []).includes(o.value)}
                                            onChange={() => toggleChannel(o.value)}
                                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-surface-700 dark:text-surface-300">{o.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-semibold px-4 py-2 hover:bg-primary-700 transition-colors"
                            >
                                Apply filters
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center rounded-lg border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 text-sm font-medium px-4 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                        <i className="ph-thin ph-receipt text-6xl text-surface-300 dark:text-surface-700 mb-4"></i>
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No completed or cancelled orders</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">
                            {activeFilterCount > 0 ? 'No orders match the current filters. Try clearing some filters.' : 'Completed and cancelled orders will appear here.'}
                        </p>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 overflow-hidden">
                        <div className="overflow-x-auto max-h-[calc(100vh-18rem)] overflow-y-auto">
                            <table className="w-full text-left text-sm min-w-[800px]">
                                <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Reference</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Customer</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Channel</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Type</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Paid</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Total</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <CompletedOrderTableRow key={order.id} order={order} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400 flex items-center justify-between flex-wrap gap-2">
                            <PaginationLinks meta={meta} links={links} itemLabel="order" fallbackTotal={!meta ? orders.length : undefined} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col min-h-0 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/30 dark:bg-surface-800/30 overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-18rem)] p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {orders.map((order) => (
                                    <OrderListRow key={order.id} order={order} />
                                ))}
                            </div>
                        </div>
                        <div className="shrink-0 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 text-xs text-surface-500 dark:text-surface-400 flex items-center justify-between flex-wrap gap-2">
                            <PaginationLinks meta={meta} links={links} itemLabel="order" fallbackTotal={!meta ? orders.length : undefined} />
                        </div>
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
