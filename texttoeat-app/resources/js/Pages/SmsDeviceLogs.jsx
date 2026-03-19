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

export default function SmsDeviceLogs({ device, logs }) {
    const items = logs?.data ?? [];

    const goBack = () => {
        router.get('/portal/sms-devices');
    };

    const gotoPage = (url) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-6 animate-fade-in pt-2 pb-12">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <PageHeader
                        title={device.name || 'SMS device logs'}
                        description={`Outbound SMS activity for device ${device.device_id ?? '—'}.`}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={goBack}>
                        Back to devices
                    </Button>
                </div>

                <Card className="rounded-2xl border-surface-200 dark:border-surface-700">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                                Device details
                            </p>
                            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                                ID: <span className="font-mono">{device.device_id}</span>
                            </p>
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400 space-y-1 text-right">
                            <p>
                                Last used:{' '}
                                <span className="font-mono">
                                    {device.last_used_at ? formatRelativeTime(device.last_used_at) : '—'}
                                </span>
                            </p>
                            <p>
                                Last heartbeat:{' '}
                                <span className="font-mono">
                                    {device.last_heartbeat_at
                                        ? formatRelativeTime(device.last_heartbeat_at)
                                        : '—'}
                                </span>
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 py-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-surface-50 dark:bg-surface-900/60 border-b border-surface-200 dark:border-surface-700">
                                    <tr className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                        <th className="px-4 py-3 text-left">Time</th>
                                        <th className="px-4 py-3 text-left">To</th>
                                        <th className="px-4 py-3 text-left">Message</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Error</th>
                                        <th className="px-4 py-3 text-right">Conversation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-8 text-center text-sm text-surface-500 dark:text-surface-400"
                                            >
                                                No outbound SMS logs for this device yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-surface-100 dark:border-surface-800/80 last:border-b-0"
                                            >
                                                <td className="px-4 py-3 align-top font-mono text-xs text-surface-600 dark:text-surface-300">
                                                    {row.sent_at || row.created_at || '—'}
                                                </td>
                                                <td className="px-4 py-3 align-top font-mono text-xs text-surface-700 dark:text-surface-200">
                                                    {row.to}
                                                </td>
                                                <td className="px-4 py-3 align-top text-surface-800 dark:text-surface-100">
                                                    <div className="max-w-xs whitespace-pre-wrap break-words text-xs">
                                                        {row.body}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top text-xs">
                                                    <span className="inline-flex rounded-full bg-surface-100 dark:bg-surface-800 px-2 py-0.5 font-medium text-surface-700 dark:text-surface-200">
                                                        {row.status ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-top text-xs text-red-600 dark:text-red-400">
                                                    {row.failure_reason || row.error_message || row.error_code || '—'}
                                                </td>
                                                <td className="px-4 py-3 align-top text-right">
                                                    {row.chatbot_log_url ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="xs"
                                                            onClick={() => router.get(row.chatbot_log_url)}
                                                        >
                                                            View
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-surface-400 dark:text-surface-500">
                                                            —
                                                        </span>
                                                    )}
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
                                    Showing {items.length} of {logs.total} logs
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

