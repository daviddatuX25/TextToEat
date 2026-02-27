import PortalLayout from '../Layouts/PortalLayout';

export default function OrderLogs({ logs = [] }) {
    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                    <i className="ph-bold ph-list-checks"></i>
                    Order logs
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">Order logs</h1>
                <p className="text-surface-600 dark:text-surface-400">Recent staff actions on orders.</p>

                {logs.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500">
                        No order logs yet.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                        <ul className="divide-y divide-surface-200 dark:divide-surface-700">
                            {logs.map((log) => (
                                <li key={log.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono font-semibold text-surface-800 dark:text-surface-100">{log.action}</span>
                                        <span className="text-surface-500">Order #{log.model_id}</span>
                                        {log.user_name && <span className="text-surface-500">by {log.user_name}</span>}
                                    </div>
                                    <span className="text-surface-400 text-xs">{log.created_at}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
