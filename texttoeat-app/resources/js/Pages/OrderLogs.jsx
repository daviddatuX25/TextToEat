import { useState, useEffect, useCallback } from 'react';
import { Link, router } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { TypewriterText, PaginationLinks } from '../components/ui';
import { LogFilterPanel } from '../components/logs/LogFilterPanel';
import { OrderLogTableRow } from '../components/logs/OrderLogTableRow';
import { OrderLogCard } from '../components/logs/OrderLogCard';
import { LayoutGrid, List, Search } from 'lucide-react';

const ORDER_LOGS_VIEW_MODE_KEY = 'orderLogsViewMode';

function buildLogsParams(filters, overrides = {}) {
    return { ...filters, ...overrides };
}

export default function OrderLogs({ logs, filters = {}, meta = {} }) {
    const items = Array.isArray(logs) ? logs : logs?.data ?? [];
    const links = !Array.isArray(logs) && logs?.links ? logs.links : [];
    const paginationMeta = meta?.pagination ?? null;

    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'card';
        return window.localStorage?.getItem(ORDER_LOGS_VIEW_MODE_KEY) || 'card';
    });
    const [searchInput, setSearchInput] = useState(() => filters.search ?? '');

    useEffect(() => {
        setSearchInput((prev) => (filters.search ?? '') !== prev ? (filters.search ?? '') : prev);
    }, [filters.search]);

    useEffect(() => {
        if (typeof window !== 'undefined' && viewMode) {
            window.localStorage?.setItem(ORDER_LOGS_VIEW_MODE_KEY, viewMode);
        }
    }, [viewMode]);

    const handleSubmit = useCallback((nextFilters) => {
        router.get('/portal/logs/orders', buildLogsParams(filters, nextFilters), {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const applySearch = useCallback(() => {
        const q = searchInput.trim();
        router.get('/portal/logs/orders', buildLogsParams(filters, { search: q || undefined, page: 1 }), {
            preserveState: true,
            replace: true,
        });
    }, [filters, searchInput]);

    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <header className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Order logs
                        </h1>
                        <Link
                            href="/portal/orders"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 smooth-hover"
                        >
                            ← Back to orders
                        </Link>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        <TypewriterText text="Recent staff actions on orders. Filter by date, status, channel, customer, and staff." />
                    </p>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <form
                            className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm"
                            onSubmit={(e) => { e.preventDefault(); applySearch(); }}
                        >
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" aria-hidden />
                                <input
                                    type="search"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search (customer, reference)…"
                                    className="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    aria-label="Search order logs"
                                />
                            </div>
                            <button
                                type="submit"
                                className="shrink-0 rounded-lg bg-primary-600 text-white text-sm font-semibold px-3 py-2 hover:bg-primary-700 transition-colors"
                            >
                                Search
                            </button>
                        </form>
                        <LogFilterPanel
                            context="orders"
                            filters={filters}
                            statusOptions={meta.statusOptions ?? []}
                            channelOptions={meta.channelOptions ?? []}
                            staffOptions={meta.staffOptions ?? []}
                            showStaff
                            onSubmit={handleSubmit}
                        />
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
                                    ? 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
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
                                    ? 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
                                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
                            }`}
                        >
                            <List className="h-4 w-4" />
                            Table
                        </button>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                        <i className="ph-thin ph-list-checks text-6xl text-surface-300 dark:text-surface-700 mb-4" aria-hidden />
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No order logs yet</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">
                            Staff actions on orders will appear here. Try adjusting your filters.
                        </p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 overflow-hidden">
                        <div className="overflow-x-auto max-h-[calc(100vh-18rem)] overflow-y-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Action</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Reference</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Channel</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Customer</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Staff</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((log) => (
                                        <OrderLogTableRow key={log.id} log={log} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400 flex flex-wrap items-center justify-between gap-2">
                            <PaginationLinks meta={paginationMeta} links={links} itemLabel="log" fallbackTotal={items.length} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col min-h-0 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/30 dark:bg-surface-800/30 overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-18rem)] p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {items.map((log) => (
                                    <OrderLogCard key={log.id} log={log} />
                                ))}
                            </div>
                        </div>
                        <div className="shrink-0 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 text-xs text-surface-500 dark:text-surface-400 flex flex-wrap items-center justify-between gap-2">
                            <PaginationLinks meta={paginationMeta} links={links} itemLabel="log" fallbackTotal={items.length} />
                        </div>
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
