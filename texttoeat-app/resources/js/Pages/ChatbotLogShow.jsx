import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';

export default function ChatbotLogShow({ session, messages = [] }) {
    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <header className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Chatbot session
                        </h1>
                        <Link
                            href="/portal/logs/chatbot"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 smooth-hover"
                        >
                            ← Back to logs
                        </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-surface-600 dark:text-surface-300">
                        <span className="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-xs font-semibold uppercase tracking-wide">
                            {session.channel}
                        </span>
                        <span className="font-mono text-xs text-surface-500 dark:text-surface-400">
                            {session.external_id}
                        </span>
                        {session.saved_customer_name && (
                            <span className="text-surface-600 dark:text-surface-200">{session.saved_customer_name}</span>
                        )}
                        {session.language && (
                            <span className="text-surface-500 dark:text-surface-400 text-xs">
                                {session.language.toUpperCase()}
                            </span>
                        )}
                        <span className="text-xs text-surface-400 dark:text-surface-500">
                            {session.message_count} message{session.message_count === 1 ? '' : 's'}
                        </span>
                        {session.has_human_takeover && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[11px] font-semibold uppercase tracking-wide">
                                Human takeover
                            </span>
                        )}
                    </div>
                </header>

                <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/50 overflow-hidden flex flex-col max-h-[calc(100vh-14rem)]">
                    <div className="px-4 py-2 border-b border-surface-200 dark:border-surface-800 text-xs text-surface-500 dark:text-surface-400 flex items-center justify-between gap-2">
                        <span>
                            Started at{' '}
                            <span className="font-mono">
                                {session.created_at || '—'}
                            </span>
                        </span>
                        <span>
                            Last activity{' '}
                            <span className="font-mono">
                                {session.last_activity_at || session.created_at || '—'}
                            </span>
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-surface-50/60 dark:bg-surface-950/40">
                        {messages.length > 0 &&
                            messages.map((message) => {
                                const isOutbound = message.direction === 'outbound';
                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm border ${
                                                isOutbound
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border-surface-200 dark:border-surface-700'
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap break-words">
                                                {message.body}
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-80">
                                                <span className="font-mono">
                                                    {message.created_at || '—'}
                                                </span>
                                                <span className="uppercase tracking-wide">
                                                    {message.channel}
                                                    {message.type === 'outbound_sms' && message.status
                                                        ? ` · ${message.status}`
                                                        : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </section>
        </PortalLayout>
    );
}

