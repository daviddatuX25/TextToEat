import { router } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, PageHeader } from '../components/ui';
import { Button } from '../components/ui/Button';

function formatRelativeTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const sec = Math.floor((now - d) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return d.toLocaleString();
}

export default function SmsInboundWebhookSkipped({ logs }) {
    const items = logs?.data ?? [];

    const gotoPage = (url) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 animate-fade-in pt-2 pb-12">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <PageHeader
                        title="Skipped inbound webhooks"
                        description="POSTs to /api/sms/incoming that were not processed because the gateway message_id matched an earlier webhook within 10 minutes (idempotency). Per-device SMS logs only show outbound messages from this server."
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => router.get('/portal/sms-devices')}>
                        Back to SMS devices
                    </Button>
                </div>

                <Card className="rounded-2xl border-surface-200 dark:border-surface-700">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-amber-50/80 dark:bg-amber-950/20 px-6 py-4">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                            Duplicate gateway message_id — chatbot not run
                        </p>
                        <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                            Rows appear only when the server returns{' '}
                            <code className="text-[11px] px-1 rounded bg-amber-100 dark:bg-amber-900/40">duplicate: true</code> to TextBee.
                        </p>
                    </CardHeader>
                    <CardContent className="px-0 py-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-surface-50 dark:bg-surface-900/60 border-b border-surface-200 dark:border-surface-700">
                                    <tr className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                        <th className="px-4 py-3 text-left">Time</th>
                                        <th className="px-4 py-3 text-left">From</th>
                                        <th className="px-4 py-3 text-left">Gateway message_id</th>
                                        <th className="px-4 py-3 text-left">Body</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-8 text-center text-sm text-surface-500 dark:text-surface-400"
                                            >
                                                No skipped webhooks recorded yet. If duplicates occur, they will appear here and in{' '}
                                                <span className="font-mono text-xs">laravel.log</span> (search for{' '}
                                                <span className="font-mono text-xs">duplicate message_id</span>).
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-surface-100 dark:border-surface-800/80 last:border-b-0"
                                            >
                                                <td className="px-4 py-3 align-top font-mono text-xs text-surface-600 dark:text-surface-300">
                                                    {row.created_at ? formatRelativeTime(row.created_at) : '—'}
                                                    <div className="text-[10px] text-surface-400 mt-0.5 whitespace-nowrap">{row.created_at}</div>
                                                </td>
                                                <td className="px-4 py-3 align-top font-mono text-xs text-surface-700 dark:text-surface-200">
                                                    {row.from_phone}
                                                </td>
                                                <td className="px-4 py-3 align-top font-mono text-xs break-all text-surface-800 dark:text-surface-100">
                                                    {row.gateway_message_id ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 align-top text-surface-800 dark:text-surface-100">
                                                    <div className="max-w-md whitespace-pre-wrap break-words text-xs">{row.message_body}</div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {logs?.links && logs.links.length > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 dark:text-surface-400">
                                <span>
                                    Showing {items.length} of {logs.total} events
                                </span>
                                <div className="inline-flex gap-1">
                                    {logs.links.map((link, index) => {
                                        const label = link.label
                                            .replace('&laquo;', '«')
                                            .replace('&raquo;', '»');
                                        const isActive = link.active;
                                        const isDisabled = !link.url;

                                        return (
                                            <button
                                                key={`${label}-${index}`}
                                                type="button"
                                                onClick={() => gotoPage(link.url)}
                                                disabled={isDisabled || isActive}
                                                className={`px-2 py-1 rounded-md border text-xs ${
                                                    isActive
                                                        ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-500/10 dark:text-primary-300'
                                                        : 'border-transparent hover:border-surface-300 hover:bg-surface-50 dark:hover:border-surface-600 dark:hover:bg-surface-800'
                                                } ${isDisabled ? 'opacity-40 cursor-default' : ''}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </PortalLayout>
    );
}
