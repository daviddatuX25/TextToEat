import PortalLayout from '../Layouts/PortalLayout';

export default function ChatbotLogs({ sessions = [] }) {
    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                    <i className="ph-bold ph-chat-circle-dots"></i>
                    Chatbot logs
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">Chatbot logs</h1>
                <p className="text-surface-600 dark:text-surface-400">Recent chatbot sessions.</p>

                {sessions.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500">
                        No chatbot sessions yet.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                        <ul className="divide-y divide-surface-200 dark:divide-surface-700">
                            {sessions.map((s) => (
                                <li key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-surface-800 dark:text-surface-100 capitalize">{s.channel}</span>
                                        <span className="text-surface-500 font-mono text-xs">{s.external_id}</span>
                                        <span className="text-surface-500">{s.conversations_count} message(s)</span>
                                        {s.language && <span className="text-surface-400 text-xs">{s.language}</span>}
                                    </div>
                                    <span className="text-surface-400 text-xs">{s.last_activity_at || s.created_at}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
