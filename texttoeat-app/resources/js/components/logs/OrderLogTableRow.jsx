export function OrderLogTableRow({ log }) {
    const order = log.order ?? null;
    const user = log.user ?? null;

    return (
        <tr className="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
            <td className="py-2.5 px-3 text-sm font-medium text-surface-800 dark:text-surface-200">
                {log.action}
            </td>
            <td className="py-2.5 px-3 text-xs font-mono text-surface-600 dark:text-surface-400 tabular-nums whitespace-nowrap">
                {order ? (order.reference ?? `#${order.id}`) : '—'}
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                {order?.status ? (
                    <span className="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-[11px] uppercase tracking-wide text-surface-600 dark:text-surface-300">
                        {String(order.status).replace(/_/g, ' ')}
                    </span>
                ) : (
                    <span className="text-surface-400">—</span>
                )}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-600 dark:text-surface-400 capitalize">
                {order?.channel ? String(order.channel).replace(/_/g, ' ') : '—'}
            </td>
            <td className="py-2.5 px-3 text-sm text-surface-800 dark:text-surface-200 max-w-[160px] truncate" title={order?.customer_name || order?.customer_phone || ''}>
                {order?.customer_name || order?.customer_phone || '—'}
                {order?.customer_phone && order?.customer_name && (
                    <span className="text-surface-500 text-xs block truncate">{order.customer_phone}</span>
                )}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400">
                {user?.name ?? '—'}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap tabular-nums">
                {log.created_at}
            </td>
        </tr>
    );
}
