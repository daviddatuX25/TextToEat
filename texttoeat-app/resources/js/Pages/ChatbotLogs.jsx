import { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { TypewriterText } from '../components/ui';
import { LogFilterPanel } from '../components/logs/LogFilterPanel';
import { ChatbotLogTableRow } from '../components/logs/ChatbotLogTableRow';
import { ChatbotLogCard } from '../components/logs/ChatbotLogCard';
import { LayoutGrid, List } from 'lucide-react';

const CHATBOT_LOGS_VIEW_MODE_KEY = 'chatbotLogsViewMode';

export default function ChatbotLogs({ sessions, filters = {}, meta = {} }) {
    const items = Array.isArray(sessions) ? sessions : sessions?.data ?? [];
    const links = !Array.isArray(sessions) && sessions?.links ? sessions.links : [];

    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'card';
        return window.localStorage?.getItem(CHATBOT_LOGS_VIEW_MODE_KEY) || 'card';
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && viewMode) {
            window.localStorage?.setItem(CHATBOT_LOGS_VIEW_MODE_KEY, viewMode);
        }
    }, [viewMode]);

    const handleSubmit = (nextFilters) => {
        router.get('/portal/logs/chatbot', nextFilters, {
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
                            Chatbot logs
                        </h1>
                        <Link
                            href="/portal/inbox"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 smooth-hover"
                        >
                            ← Back to inbox
                        </Link>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        <TypewriterText text="Recent chatbot sessions. Filter by date, channel, customer, status, and human takeover." />
                    </p>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <LogFilterPanel
                        context="chatbot"
                        filters={filters}
                        statusOptions={meta.statusOptions ?? []}
                        channelOptions={meta.channelOptions ?? []}
                        showHasHumanTakeover
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
                                    ? 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
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
                                    ? 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
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
                        <i className="ph-thin ph-chat-circle-dots text-6xl text-surface-300 dark:text-surface-700 mb-4" aria-hidden />
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No chatbot sessions yet</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">
                            Sessions will appear here. Try adjusting your filters.
                        </p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 overflow-hidden">
                        <div className="overflow-x-auto max-h-[calc(100vh-18rem)] overflow-y-auto">
                            <table className="w-full table-fixed border-collapse text-left text-sm min-w-[760px]">
                                <colgroup>
                                    <col className="w-[10%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[18%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[8%]" />
                                    <col className="w-[18%]" />
                                </colgroup>
                                <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                    <tr>
                                        <th scope="col" className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs align-middle text-left">
                                            Channel
                                        </th>
                                        <th scope="col" className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs align-middle text-left">
                                            External ID
                                        </th>
                                        <th scope="col" className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs align-middle text-left">
                                            Customer
                                        </th>
                                        <th scope="col" className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs align-middle text-left">
                                            Messages
                                        </th>
                                        <th scope="col" className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs align-middle text-left">
                                            Takeover
                                        </th>
                                        <th scope="col" className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs align-middle text-left">
                                            Lang
                                        </th>
                                        <th scope="col" className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs align-middle text-left">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((s) => (
                                        <ChatbotLogTableRow key={s.id} session={s} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400 flex flex-wrap items-center justify-between gap-2">
                            <span>{items.length} session{items.length !== 1 ? 's' : ''}</span>
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
                                                        ? 'border-surface-500 bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
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
                                    <ChatbotLogCard key={s.id} session={s} />
                                ))}
                            </div>
                        </div>
                        <div className="shrink-0 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 text-xs text-surface-500 dark:text-surface-400 flex flex-wrap items-center justify-between gap-2">
                            <span>{items.length} session{items.length !== 1 ? 's' : ''}</span>
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
                                                        ? 'border-surface-500 bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
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
