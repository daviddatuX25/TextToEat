import { Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePortalConversationsLive } from '../hooks/usePortalConversationsLive';
import PortalLayout from '../Layouts/PortalLayout';

function ModeBadge({ mode }) {
    if (mode === 'staff_only') {
        return (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200 text-[11px] font-semibold uppercase tracking-wide">
                Staff only
            </span>
        );
    }
    if (mode === 'takeover') {
        return (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[11px] font-semibold uppercase tracking-wide">
                Human takeover
            </span>
        );
    }
    return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 text-[11px] font-semibold uppercase tracking-wide">
            Bot
        </span>
    );
}

export default function ConversationInboxShow({ session, outbound_sms: outboundSms = [], thread = [], meta = {} }) {
    usePortalConversationsLive();
    const threadEndRef = useRef(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [resolving, setResolving] = useState(false);

    const takeoverTimeoutMinutes = meta.takeoverTimeoutMinutes ?? 60;
    const isSms = session?.channel === 'sms';
    const isMessenger = session?.channel === 'messenger';

    const automationEnabled = useMemo(() => !Boolean(session?.automation_disabled), [session?.automation_disabled]);

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread]);

    const submitReply = (e) => {
        e.preventDefault();
        const trimmed = message.trim();
        if (!trimmed || sending) return;

        setSending(true);
        router.post(
            `/portal/inbox/sessions/${session.id}/reply`,
            { message: trimmed },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSending(false);
                    setMessage('');
                },
            }
        );
    };

    const setAutomation = (enabled) => {
        if (toggling) return;
        setToggling(true);
        router.patch(
            `/portal/inbox/sessions/${session.id}/automation`,
            { enabled: Boolean(enabled) },
            {
                preserveScroll: true,
                onFinish: () => setToggling(false),
            }
        );
    };

    const markSolved = () => {
        if (resolving) return;
        setResolving(true);
        router.post(`/portal/inbox/sessions/${session.id}/resolve`, {}, { onFinish: () => setResolving(false) });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 animate-fade-in">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                        <i className="ph-bold ph-inbox" />
                        Conversation takeover
                    </div>
                    <Link
                        href="/portal/inbox"
                        className="text-sm font-semibold text-surface-600 hover:text-primary-600 dark:text-surface-300 dark:hover:text-primary-400"
                    >
                        ← Back to inbox
                    </Link>
                </div>

                <header className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        {session?.saved_customer_name || session?.external_id}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold capitalize">{session?.channel}</span>
                        <span className="text-surface-500 font-mono text-xs">{session?.external_id}</span>
                        <ModeBadge mode={session?.mode} />
                        {session?.current_state && (
                            <span className="text-surface-500 text-xs capitalize">
                                State: {String(session.current_state).replace(/_/g, ' ')}
                            </span>
                        )}
                        {session?.language && (
                            <span className="text-surface-400 text-xs">{String(session.language).toUpperCase()}</span>
                        )}
                    </div>
                    {session?.mode !== 'bot' && (
                        <p className="text-surface-600 dark:text-surface-400 text-sm">
                            Takeover expires after {takeoverTimeoutMinutes} minutes of no activity and returns to bot mode.
                        </p>
                    )}
                </header>

                {session?.mode === 'bot' && (
                    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/80 p-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-surface-700 dark:text-surface-300">
                            This session is no longer in human takeover. The customer has returned to the bot.
                        </p>
                        <Link
                            href="/portal/inbox"
                            className="rounded-lg px-4 py-2 text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                        >
                            Back to inbox
                        </Link>
                    </div>
                )}

                {session?.mode !== 'bot' && (
                <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/60 p-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-bold text-surface-800 dark:text-surface-100">
                            Automated responses
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={toggling}
                                onClick={() => setAutomation(true)}
                                className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition-colors ${
                                    automationEnabled
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                                        : 'border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
                                }`}
                            >
                                On
                            </button>
                            <button
                                type="button"
                                disabled={toggling}
                                onClick={() => setAutomation(false)}
                                className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition-colors ${
                                    !automationEnabled
                                        ? 'border-slate-500 bg-slate-50 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200'
                                        : 'border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
                                }`}
                            >
                                Off
                            </button>
                        </div>
                    </div>
                    {!automationEnabled && (
                        <div className="text-xs text-surface-500">
                            Bot replies are disabled for this session. Only staff replies from the portal will be sent until you turn this back on or the takeover expires.
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-200 dark:border-surface-700">
                        <div className="text-sm font-bold text-surface-800 dark:text-surface-100">Mark solved</div>
                        <button
                            type="button"
                            disabled={resolving}
                            onClick={markSolved}
                            className="rounded-lg px-3 py-1.5 text-sm font-semibold border border-primary-500 bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                            Return to bot
                        </button>
                    </div>
                </div>
                )}

                <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/60 p-4">
                    <h2 className="text-lg font-bold mb-3">Conversation</h2>
                    <div className="flex flex-col max-h-[28rem] overflow-y-auto">
                        {thread.length === 0 ? (
                            <p className="text-sm text-surface-500 py-4">No messages yet.</p>
                        ) : (
                            <ul className="flex flex-col gap-3 py-1">
                                {thread.map((m) => (
                                    <li
                                        key={m.id}
                                        className={`flex ${m.direction === 'in' ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                                m.direction === 'in'
                                                    ? 'rounded-tl-md bg-amber-50 dark:bg-amber-500/10 text-surface-800 dark:text-surface-200'
                                                    : 'rounded-tr-md bg-primary-100 dark:bg-primary-500/20 text-primary-900 dark:text-primary-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-xs font-semibold text-surface-600 dark:text-surface-400">
                                                    {m.direction === 'in' ? 'Customer' : 'Staff'}
                                                </span>
                                                <span className="text-xs text-surface-400 tabular-nums">{m.created_at}</span>
                                            </div>
                                            <div className="whitespace-pre-wrap">{m.body}</div>
                                            {m.direction === 'out' && m.status === 'failed' && (
                                                <div className="text-xs text-surface-500 mt-1">Status: {m.status}</div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                                <li ref={threadEndRef} className="h-0 overflow-hidden" aria-hidden />
                            </ul>
                        )}
                    </div>
                </div>

                {session?.mode !== 'bot' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/60 p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h2 className="text-lg font-bold">Reply</h2>
                            <span className="text-xs text-surface-500">
                                {isSms ? 'Sends via SMS (FCM → phone)' : isMessenger ? 'Sends via Messenger' : ''}
                            </span>
                        </div>
                        <form onSubmit={submitReply} className="flex flex-col gap-3">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={5}
                                placeholder="Type your message…"
                                className="w-full rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                                type="submit"
                                disabled={sending || !message.trim()}
                                className="rounded-xl px-4 py-2.5 text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Send
                            </button>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/60 p-4">
                        <h2 className="text-lg font-bold mb-3">Recent outbound</h2>
                        {!isSms ? (
                            <div className="text-sm text-surface-500">
                                Outbound history is currently shown for SMS only.
                            </div>
                        ) : outboundSms.length === 0 ? (
                            <div className="text-sm text-surface-500">No outbound SMS yet.</div>
                        ) : (
                            <ul className="divide-y divide-surface-200 dark:divide-surface-700">
                                {outboundSms.map((o) => (
                                    <li key={o.id} className="py-3 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-surface-800 dark:text-surface-100">
                                                {o.status}
                                            </span>
                                            <span className="text-xs text-surface-400 tabular-nums">
                                                {o.sent_at || o.created_at}
                                            </span>
                                        </div>
                                        <div className="text-xs text-surface-500 font-mono break-all">{o.to}</div>
                                        <div className="text-sm text-surface-700 dark:text-surface-200 whitespace-pre-wrap mt-1">
                                            {o.body}
                                        </div>
                                        {o.failure_reason && (
                                            <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                                                {o.failure_reason}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                )}
            </section>
        </PortalLayout>
    );
}

