import { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { TypewriterText } from '../components/ui';
import { usePortalConversationsLive } from '../hooks/usePortalConversationsLive';
import { LogFilterPanel } from '../components/logs/LogFilterPanel';
import { LayoutGrid, List } from 'lucide-react';

const INBOX_VIEW_MODE_KEY = 'conversationInboxViewMode';

function InboxSessionTableRow({ session }) {
    const openSession = () => router.visit(`/portal/inbox/${session.id}`);
    return (
        <tr
            role="button"
            tabIndex={0}
            onClick={openSession}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSession(); } }}
            className="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors cursor-pointer"
        >
            <td className="py-2.5 px-3 text-sm font-medium text-surface-800 dark:text-surface-200 capitalize">
                {session.channel}
            </td>
            <td className="py-2.5 px-3 text-xs font-mono text-surface-600 dark:text-surface-400 truncate max-w-[100px]" title={session.external_id}>
                {session.external_id}
            </td>
            <td className="py-2.5 px-3 text-sm text-surface-800 dark:text-surface-200 max-w-[140px] truncate" title={session.saved_customer_name}>
                {session.saved_customer_name ?? '—'}
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-600 dark:text-surface-400 capitalize">
                {session.current_state ? session.current_state.replace(/_/g, ' ') : '—'}
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                {session.mode === 'staff_only' ? (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200 text-[11px] font-semibold uppercase">
                        Staff only
                    </span>
                ) : session.has_human_takeover ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[11px] font-semibold uppercase">
                        Takeover
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

function InboxSessionCard({ session }) {
    return (
        <Link
            href={`/portal/inbox/${session.id}`}
            className="block rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 p-4 transition-colors hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md"
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                    <span className="font-semibold text-surface-800 dark:text-surface-100 capitalize">
                        {session.channel}
                    </span>
                    <p className="text-surface-500 font-mono text-xs truncate" title={session.external_id}>
                        {session.external_id}
                    </p>
                    {session.saved_customer_name && (
                        <p className="text-sm text-surface-600 dark:text-surface-300">{session.saved_customer_name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {session.current_state && (
                            <span className="text-surface-500 capitalize">
                                {session.current_state.replace(/_/g, ' ')}
                            </span>
                        )}
                        {session.mode === 'staff_only' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200 font-semibold uppercase tracking-wide">
                                Staff only
                            </span>
                        )}
                        {session.has_human_takeover && session.mode !== 'staff_only' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 font-semibold uppercase tracking-wide">
                                Human takeover
                            </span>
                        )}
                        {session.sms_summary && (
                            <span className="text-surface-500" title="SMS delivery">
                                SMS: {session.sms_summary.sent_count} sent
                                {session.sms_summary.pending_count > 0 ? `, ${session.sms_summary.pending_count} pending` : ''}
                                {session.sms_summary.failed_count > 0 ? `, ${session.sms_summary.failed_count} failed` : ''}
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
        </Link>
    );
}

export default function ConversationInbox({ sessions, filters = {}, meta = {} }) {
    usePortalConversationsLive();
    const items = Array.isArray(sessions) ? sessions : sessions?.data ?? [];
    const links = !Array.isArray(sessions) && sessions?.links ? sessions.links : [];

    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'card';
        return window.localStorage?.getItem(INBOX_VIEW_MODE_KEY) || 'card';
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && viewMode) {
            window.localStorage?.setItem(INBOX_VIEW_MODE_KEY, viewMode);
        }
    }, [viewMode]);

    const handleSubmit = (nextFilters) => {
        router.get('/portal/inbox', nextFilters, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <header className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Conversation inbox
                        </h1>
                        <Link
                            href="/portal"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 smooth-hover"
                        >
                            ← Back to dashboard
                        </Link>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        <TypewriterText text="Sessions needing or that had human response (SMS and Messenger). Filter by date, channel, or session state." />
                    </p>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <LogFilterPanel
                        context="chatbot"
                        filters={filters}
                        statusOptions={meta.statusOptions ?? []}
                        channelOptions={meta.channelOptions ?? []}
                        showHasHumanTakeover={false}
                        onSubmit={handleSubmit}
                    />
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
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
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
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
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
                        <i className="ph-thin ph-inbox text-6xl text-surface-300 dark:text-surface-700 mb-4" aria-hidden />
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No conversations match the filters</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">
                            Try adjusting your filters or wait for new sessions. SMS and Messenger conversations will appear here.
                        </p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 overflow-hidden">
                        <div className="overflow-x-auto max-h-[calc(100vh-18rem)] overflow-y-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Channel</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">External ID</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Customer</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">State</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Mode</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Lang</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((s) => (
                                        <InboxSessionTableRow key={s.id} session={s} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400 flex flex-wrap items-center justify-between gap-2">
                            <span>{items.length} conversation{items.length !== 1 ? 's' : ''}</span>
                            {Array.isArray(links) && links.length > 1 && (
                                <nav className="flex flex-wrap justify-end gap-1">
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
                    </div>
                ) : (
                    <div className="flex flex-col min-h-0 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/30 dark:bg-surface-800/30 overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-18rem)] p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {items.map((s) => (
                                    <InboxSessionCard key={s.id} session={s} />
                                ))}
                            </div>
                        </div>
                        <div className="shrink-0 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 text-xs text-surface-500 dark:text-surface-400 flex flex-wrap items-center justify-between gap-2">
                            <span>{items.length} conversation{items.length !== 1 ? 's' : ''}</span>
                            {Array.isArray(links) && links.length > 1 && (
                                <nav className="flex flex-wrap justify-end gap-1">
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
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
