export function OrderLogCard({ log }) {
    const order = log.order ?? null;
    const user = log.user ?? null;

    return (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 p-4 transition-colors hover:border-surface-300 dark:hover:border-surface-600">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                    <span className="font-mono font-semibold text-surface-800 dark:text-surface-100">
                        {log.action}
                    </span>
                    {order && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-surface-500 font-mono">{order.reference ?? `#${order.id}`}</span>
                            {order.status && (
                                <span className="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 uppercase tracking-wide">
                                    {String(order.status).replace(/_/g, ' ')}
                                </span>
                            )}
                            {order.channel && (
                                <span className="text-surface-500 capitalize">{String(order.channel).replace(/_/g, ' ')}</span>
                            )}
                            {(order.customer_name || order.customer_phone) && (
                                <span className="text-surface-500">
                                    {order.customer_name}
                                    {order.customer_phone ? ` (${order.customer_phone})` : ''}
                                </span>
                            )}
                        </div>
                    )}
                    {user && (
                        <p className="text-xs text-surface-500">by {user.name}</p>
                    )}
                </div>
                <span className="text-xs text-surface-400 tabular-nums shrink-0">
                    {log.created_at}
                </span>
            </div>
        </div>
    );
}
