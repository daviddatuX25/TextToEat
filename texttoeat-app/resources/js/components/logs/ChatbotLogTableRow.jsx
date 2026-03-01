export function ChatbotLogTableRow({ session }) {
    return (
        <tr className="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
            <td className="py-2.5 px-3 text-sm font-medium text-surface-800 dark:text-surface-200 capitalize">
                {session.channel}
            </td>
            <td className="py-2.5 px-3 text-xs font-mono text-surface-600 dark:text-surface-400 truncate max-w-[120px]" title={session.external_id}>
                {session.external_id}
            </td>
            <td className="py-2.5 px-3 text-sm text-surface-800 dark:text-surface-200 max-w-[140px] truncate" title={session.saved_customer_name}>
                {session.saved_customer_name ?? '—'}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-600 dark:text-surface-400 tabular-nums">
                {session.conversations_count ?? 0} msg(s)
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                {session.has_human_takeover ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[11px] font-semibold uppercase tracking-wide">
                        Yes
                    </span>
                ) : (
                    <span className="text-surface-400 text-xs">—</span>
                )}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400 uppercase">
                {session.language ?? '—'}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap tabular-nums">
                {session.last_activity_at || session.created_at}
            </td>
        </tr>
    );
}
