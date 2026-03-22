import { router } from '@inertiajs/react';

export function ChatbotLogTableRow({ session }) {
    const href = `/portal/logs/chatbot/${session.id}`;

    const go = () => {
        router.visit(href);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            go();
        }
    };

    return (
        <tr
            tabIndex={0}
            onClick={go}
            onKeyDown={onKeyDown}
            className="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
            aria-label={`Open chatbot session ${session.external_id ?? session.id}`}
        >
            <td className="py-2.5 px-3 text-sm font-medium text-surface-800 dark:text-surface-200 capitalize align-middle">
                {session.channel}
            </td>
            <td
                className="py-2.5 px-3 text-xs font-mono text-surface-600 dark:text-surface-400 align-middle max-w-[140px]"
                title={session.external_id}
            >
                <span className="block truncate">{session.external_id}</span>
            </td>
            <td
                className="py-2.5 px-3 text-sm text-surface-800 dark:text-surface-200 align-middle max-w-[180px]"
                title={session.saved_customer_name ?? undefined}
            >
                <span className="block truncate">{session.saved_customer_name ?? '—'}</span>
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-600 dark:text-surface-400 tabular-nums align-middle whitespace-nowrap">
                {session.message_count ?? 0} msg(s)
            </td>
            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                {session.has_human_takeover ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[11px] font-semibold uppercase tracking-wide">
                        Yes
                    </span>
                ) : (
                    <span className="text-surface-400 text-xs">—</span>
                )}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400 uppercase align-middle whitespace-nowrap">
                {session.language ?? '—'}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap tabular-nums align-middle">
                {session.last_activity_at || session.created_at}
            </td>
        </tr>
    );
}
