import { Link, router } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { LogFilterPanel } from '../components/logs/LogFilterPanel';

export default function OrderLogs({ logs, filters = {}, meta = {} }) {
    const items = Array.isArray(logs) ? logs : logs?.data ?? [];
    const links = !Array.isArray(logs) && logs?.links ? logs.links : [];

    const handleSubmit = (nextFilters) => {
        router.get('/portal/logs/orders', nextFilters, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                    <i className="ph-bold ph-list-checks"></i>
                    Order logs
                </div>
                <header className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">Order logs</h1>
                    <p className="text-surface-600 dark:text-surface-400 text-sm">
                        Recent staff actions on orders, with filters for date, status, channel, customer, and staff.
                    </p>
                </header>

                <LogFilterPanel
                    context="orders"
                    filters={filters}
                    statusOptions={meta.statusOptions ?? []}
                    channelOptions={meta.channelOptions ?? []}
                    staffOptions={meta.staffOptions ?? []}
                    showStaff
                    onSubmit={handleSubmit}
                />

                {items.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500">
                        No order logs yet.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden bg-surface-0/80 dark:bg-surface-900/60">
                        <ul className="divide-y divide-surface-200 dark:divide-surface-700">
                            {items.map((log) => {
                                const order = log.order ?? null;
                                const user = log.user ?? null;

                                return (
                                    <li key={log.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono font-semibold text-surface-800 dark:text-surface-100">
                                                {log.action}
                                            </span>
                                            {order && (
                                                <>
                                                    <span className="text-surface-500 font-mono text-xs">
                                                        {order.reference ?? `#${order.id}`}
                                                    </span>
                                                    {order.status && (
                                                        <span className="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-[11px] uppercase tracking-wide text-surface-600 dark:text-surface-300">
                                                            {String(order.status).replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                    {order.channel && (
                                                        <span className="text-surface-500 text-xs capitalize">
                                                            {String(order.channel).replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                    {(order.customer_name || order.customer_phone) && (
                                                        <span className="text-surface-500 text-xs">
                                                            {order.customer_name}
                                                            {order.customer_phone ? ` (${order.customer_phone})` : ''}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {user && (
                                                <span className="text-surface-500 text-xs">
                                                    by {user.name}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-surface-400 text-xs tabular-nums">
                                            {log.created_at}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>

                        {Array.isArray(links) && links.length > 1 && (
                            <nav className="flex justify-end gap-1 px-4 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/80 text-xs">
                                {links.map((link, index) =>
                                    link.url ? (
                                        <Link
                                            // eslint-disable-next-line react/no-array-index-key
                                            key={index}
                                            href={link.url}
                                            preserveScroll
                                            className={`px-2.5 py-1 rounded-md border text-xs ${
                                                link.active
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200'
                                                    : 'border-transparent text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            // eslint-disable-next-line react/no-array-index-key
                                            key={index}
                                            className="px-2.5 py-1 rounded-md text-surface-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                )}
                            </nav>
                        )}
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
