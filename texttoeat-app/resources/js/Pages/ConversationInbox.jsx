import { Link, router } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { LogFilterPanel } from '../components/logs/LogFilterPanel';

export default function ConversationInbox({ sessions, filters = {}, meta = {} }) {
    const items = Array.isArray(sessions) ? sessions : sessions?.data ?? [];
    const links = !Array.isArray(sessions) && sessions?.links ? sessions.links : [];

    const handleSubmit = (nextFilters) => {
        router.get('/portal/inbox', nextFilters, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                    <i className="ph-bold ph-inbox" />
                    Conversation inbox
                </div>
                <header className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Conversation inbox
                    </h1>
                    <p className="text-surface-600 dark:text-surface-400 text-sm">
                        Sessions needing human response (SMS and Messenger). Filter by date, channel, status, or human takeover.
                    </p>
                </header>

                <LogFilterPanel
                    context="chatbot"
                    filters={filters}
                    statusOptions={meta.statusOptions ?? []}
                    channelOptions={meta.channelOptions ?? []}
                    showHasHumanTakeover
                    onSubmit={handleSubmit}
                />

                {items.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500">
                        No conversations match the filters.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden bg-surface-0/80 dark:bg-surface-900/60">
                        <ul className="divide-y divide-surface-200 dark:divide-surface-700">
                            {items.map((s) => (
                                <li
                                    key={s.id}
                                    className="p-0 text-sm"
                                >
                                    <Link
                                        href={`/portal/inbox/${s.id}`}
                                        className="p-4 flex flex-wrap items-center justify-between gap-2 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-surface-800 dark:text-surface-100 capitalize">
                                                {s.channel}
                                            </span>
                                            <span className="text-surface-500 font-mono text-xs">
                                                {s.external_id}
                                            </span>
                                            {s.saved_customer_name && (
                                                <span className="text-surface-500 text-xs">
                                                    {s.saved_customer_name}
                                                </span>
                                            )}
                                            {s.current_state && (
                                                <span className="text-surface-400 text-xs capitalize">
                                                    {s.current_state.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                            {s.mode === 'staff_only' && (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200 text-[11px] font-semibold uppercase tracking-wide">
                                                    Staff only
                                                </span>
                                            )}
                                            {s.has_human_takeover && s.mode !== 'staff_only' && (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[11px] font-semibold uppercase tracking-wide">
                                                    Human takeover
                                                </span>
                                            )}
                                            {s.sms_summary && (
                                                <span className="text-surface-500 text-xs" title="SMS delivery">
                                                    SMS: {s.sms_summary.sent_count} sent
                                                    {s.sms_summary.pending_count > 0 &&
                                                        `, ${s.sms_summary.pending_count} pending`}
                                                    {s.sms_summary.failed_count > 0 &&
                                                        `, ${s.sms_summary.failed_count} failed`}
                                                    {s.sms_summary.last_sent_at &&
                                                        ` · Last: ${s.sms_summary.last_sent_at}`}
                                                </span>
                                            )}
                                            {s.language && (
                                                <span className="text-surface-400 text-xs">
                                                    {s.language.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-surface-400 text-xs tabular-nums">
                                            {s.last_activity_at || s.created_at}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {Array.isArray(links) && links.length > 1 && (
                            <nav className="flex justify-end gap-1 px-4 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/80 text-xs">
                                {links.map((link, index) =>
                                    link.url ? (
                                        <Link
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
