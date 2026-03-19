export function ChatbotLogCard({ session }) {
    return (
        <a
            href={`/portal/logs/chatbot/${session.id}`}
            className="block rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 p-4 transition-colors hover:border-surface-300 dark:hover:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-50 dark:focus:ring-offset-surface-900"
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                    <span className="font-semibold text-surface-800 dark:text-surface-100 capitalize">
                        {session.channel}
                    </span>
                    <p className="text-surface-500 font-mono text-xs">{session.external_id}</p>
                    {session.saved_customer_name && (
                        <p className="text-sm text-surface-600 dark:text-surface-300">{session.saved_customer_name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-surface-500">{session.message_count} message(s)</span>
                        {session.has_human_takeover && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 font-semibold uppercase tracking-wide">
                                Human takeover
                            </span>
                        )}
                        {session.language && (
                            <span className="text-surface-400">{session.language.toUpperCase()}</span>
                        )}
                    </div>
                </div>
                <span className="text-xs text-surface-400 tabular-nums shrink-0">
                    {session.last_activity_at || session.created_at}
                </span>
            </div>
        </a>
    );
}
