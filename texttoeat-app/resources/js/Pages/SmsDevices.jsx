import { router, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, Battery, Wifi, HardDrive, QrCode, Key } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, PageHeader } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : null;
}

function formatRelativeTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const sec = Math.floor((now - d) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return d.toLocaleDateString();
}

export default function SmsDevices({
    devices = [],
    api_key_for_qr = null,
    gateway_credentials_configured = {},
}) {
    const [heartbeatLoading, setHeartbeatLoading] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const credentialsForm = useForm({
        textbee_api_url: '',
        textbee_webhook_secret: '',
        firebase_credentials_path: '',
        firebase_device_token: '',
    });

    useEffect(() => {
        if (api_key_for_qr) {
            QRCode.toDataURL(api_key_for_qr, { width: 280, margin: 2 })
                .then(setQrDataUrl)
                .catch(() => setQrDataUrl(''));
        } else {
            setQrDataUrl('');
        }
    }, [api_key_for_qr]);

    const triggerHeartbeat = (deviceId) => {
        setHeartbeatLoading(deviceId);
        const url = `/portal/sms-devices/${encodeURIComponent(deviceId)}/heartbeat`;
        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(getCsrfToken() && { 'X-CSRF-TOKEN': getCsrfToken() }),
            },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.sent) {
                    toast.success(data.message ?? 'Heartbeat request sent.');
                    router.reload({ only: ['devices'] });
                } else {
                    toast.error(data.message ?? 'Could not send heartbeat.');
                }
            })
            .catch(() => toast.error('Request failed.'))
            .finally(() => setHeartbeatLoading(null));
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in pt-2 pb-12">
                <PageHeader
                    title="SMS devices"
                    description='Android devices that send and receive SMS via FCM. Use "Refresh status" to request battery and network info. Set a preferred SIM for outbound SMS when the device has multiple SIMs.'
                />

                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            SMS gateway credentials
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-7 pb-6 space-y-4 sm:px-8 sm:pt-8 sm:pb-8">
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                            Enter your Textbee and Firebase settings below. Secrets are stored securely. For Firebase, enter the <strong>path</strong> to your service account JSON file (your developer can tell you where it is). Leave a field blank to keep the current value.
                        </p>
                        <form
                            onSubmit={(e) => { e.preventDefault(); credentialsForm.put('/portal/sms-devices/credentials', { preserveScroll: true }); }}
                            className="space-y-4 max-w-xl"
                        >
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Textbee API URL</label>
                                <Input
                                    type="text"
                                    value={credentialsForm.data.textbee_api_url}
                                    onChange={(e) => credentialsForm.setData('textbee_api_url', e.target.value)}
                                    placeholder={gateway_credentials_configured.textbee_api_url ? '•••••••• (configured)' : 'e.g. https://api.textbee.dev'}
                                    className="font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Textbee webhook secret</label>
                                <Input
                                    type="password"
                                    autoComplete="off"
                                    value={credentialsForm.data.textbee_webhook_secret}
                                    onChange={(e) => credentialsForm.setData('textbee_webhook_secret', e.target.value)}
                                    placeholder={gateway_credentials_configured.textbee_webhook_secret ? '•••••••• (configured)' : 'For webhook signature verification'}
                                    className="font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Firebase credentials path</label>
                                <Input
                                    type="text"
                                    value={credentialsForm.data.firebase_credentials_path}
                                    onChange={(e) => credentialsForm.setData('firebase_credentials_path', e.target.value)}
                                    placeholder={gateway_credentials_configured.firebase_credentials_path ? '•••••••• (configured)' : 'Path to service account JSON file'}
                                    className="font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">FCM device token (optional)</label>
                                <Input
                                    type="password"
                                    autoComplete="off"
                                    value={credentialsForm.data.firebase_device_token}
                                    onChange={(e) => credentialsForm.setData('firebase_device_token', e.target.value)}
                                    placeholder={gateway_credentials_configured.firebase_device_token ? '•••••••• (configured)' : 'Fallback FCM token'}
                                    className="font-mono"
                                />
                            </div>
                            <Button type="submit" disabled={credentialsForm.processing}>
                                {credentialsForm.processing ? 'Saving…' : 'Save credentials'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <QrCode className="h-4 w-4" />
                            Register device via QR code
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-3">
                            {api_key_for_qr
                                ? 'Scan this QR code with the Android app. The code contains only your API key; the app will then register this device automatically.'
                                : 'If no QR code appears, contact your developer to complete the setup.'}
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-7 pb-6 flex flex-col sm:flex-row items-start gap-6 sm:px-8 sm:pt-8 sm:pb-8">
                        {api_key_for_qr ? (
                            qrDataUrl ? (
                                <div className="flex shrink-0 rounded-xl border-2 border-surface-200 dark:border-surface-600 bg-white p-2">
                                    <img src={qrDataUrl} alt="API key QR code — scan to register device" width={280} height={280} className="rounded-lg" />
                                </div>
                            ) : (
                                <div className="w-[280px] h-[280px] rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 flex items-center justify-center text-surface-400 text-sm">
                                    Generating…
                                </div>
                            )
                        ) : (
                            <div className="w-[280px] h-[280px] rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 flex items-center justify-center text-surface-500 dark:text-surface-400 text-sm text-center px-4">
                                Loading… If the QR code does not appear, contact your developer.
                            </div>
                        )}
                        <div className="text-sm text-surface-600 dark:text-surface-400 space-y-3">
                            <p><strong className="text-surface-800 dark:text-surface-200">Zero-config flow:</strong></p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Open the SMS gateway app on your Android device.</li>
                                <li>Tap &quot;Scan QR&quot; or &quot;Register device&quot;.</li>
                                <li>{api_key_for_qr ? 'Scan the code above. The app uses the API key to register and sync settings.' : 'Once the QR is visible above, scan it with the app.'}</li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>

                {devices.length === 0 ? (
                    <Card className="rounded-2xl border-surface-200 dark:border-surface-700">
                        <CardContent className="py-12 my-5 px-8 text-center">
                            <Smartphone className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
                            <p className="mt-4 text-surface-600 dark:text-surface-400">
                                No devices registered yet.
                            </p>
                            <p className="mt-3 text-sm text-surface-500 dark:text-surface-500">
                                Register from the Android app (POST /api/sms/device/register) to appear here.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {devices.map((device) => (
                            <DeviceCard
                                key={device.device_id ?? device.id}
                                device={device}
                                onHeartbeat={() => triggerHeartbeat(device.device_id)}
                                heartbeatLoading={heartbeatLoading === device.device_id}
                            />
                        ))}
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}

function DeviceCard({ device, onHeartbeat, heartbeatLoading }) {
    const form = useForm({
        name: device.name ?? '',
        enabled: device.enabled ?? true,
        preferred_sim_subscription_id: device.preferred_sim_subscription_id ?? '',
    });

    const simInfo = Array.isArray(device.sim_info) ? device.sim_info : [];
    const payload = device.last_heartbeat_payload || {};

    const handleSubmit = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            preferred_sim_subscription_id: data.preferred_sim_subscription_id === '' ? null : Number(data.preferred_sim_subscription_id),
        })).patch(`/portal/sms-devices/${encodeURIComponent(device.device_id)}`, {
            preserveScroll: true,
        });
    };

    return (
        <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
            <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 flex flex-row items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                        <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-surface-900 dark:text-white truncate">
                            {device.name || 'Unnamed device'}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 truncate" title={device.device_id ?? ''}>
                            {device.device_id ?? '—'}
                        </p>
                    </div>
                    <span
                        className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            device.enabled
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-400'
                        }`}
                    >
                        {device.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                {device.device_id && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onHeartbeat}
                    disabled={heartbeatLoading}
                >
                    {heartbeatLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Refresh status</span>
                </Button>
                )}
            </CardHeader>
            <CardContent className="px-4 pt-5 pb-4 space-y-4">
                {(device.brand || device.model || device.os) && (
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                        {[device.brand, device.model, device.os].filter(Boolean).join(' · ')}
                        {device.app_version_code != null && ` · v${device.app_version_code}`}
                    </p>
                )}

                {device.last_heartbeat_at && (
                    <div className="rounded-xl bg-surface-100 dark:bg-surface-800/60 p-3 space-y-2">
                        <p className="text-xs font-semibold text-surface-500 dark:text-surface-400">
                            Last status — {formatRelativeTime(device.last_heartbeat_at)}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm">
                            {payload.batteryPercentage != null && (
                                <span className="inline-flex items-center gap-1 text-surface-700 dark:text-surface-300">
                                    <Battery className="h-4 w-4" />
                                    {payload.batteryPercentage}%
                                    {payload.isCharging && <span className="text-emerald-600 dark:text-emerald-400">(charging)</span>}
                                </span>
                            )}
                            {payload.networkType && (
                                <span className="inline-flex items-center gap-1 text-surface-700 dark:text-surface-300">
                                    <Wifi className="h-4 w-4" />
                                    {payload.networkType}
                                </span>
                            )}
                            {(payload.memoryUsage != null || payload.storageUsage != null) && (
                                <span className="inline-flex items-center gap-1 text-surface-700 dark:text-surface-300">
                                    <HardDrive className="h-4 w-4" />
                                    {payload.memoryUsage != null && `${payload.memoryUsage} MB`}
                                    {payload.memoryUsage != null && payload.storageUsage != null && ' · '}
                                    {payload.storageUsage != null && `${payload.storageUsage} MB`}
                                </span>
                            )}
                            {!payload.batteryPercentage && !payload.networkType && payload.simInfo?.length > 0 && (
                                <span className="text-surface-600 dark:text-surface-400">
                                    {payload.simInfo.length} SIM(s) reported
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {device.device_id && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                    <label className="block sm:min-w-[200px]">
                        <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Display name</span>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                            placeholder="e.g. Office phone"
                        />
                    </label>
                    <label className="flex items-center gap-2 sm:min-w-[120px]">
                        <input
                            type="checkbox"
                            checked={form.data.enabled}
                            onChange={(e) => form.setData('enabled', e.target.checked)}
                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Enabled</span>
                    </label>
                    {simInfo.length > 0 && (
                        <label className="block sm:min-w-[220px]">
                            <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Preferred SIM (outbound SMS)</span>
                            <select
                                value={form.data.preferred_sim_subscription_id === '' ? '' : String(form.data.preferred_sim_subscription_id)}
                                onChange={(e) => form.setData('preferred_sim_subscription_id', e.target.value === '' ? '' : Number(e.target.value))}
                                className="mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                            >
                                <option value="">Default (no preference)</option>
                                {simInfo.map((sim) => (
                                    <option key={sim.subscriptionId ?? sim.slotIndex} value={sim.subscriptionId ?? ''}>
                                        {sim.displayName || sim.carrierName || `SIM ${(sim.slotIndex ?? 0) + 1}`} (ID: {sim.subscriptionId})
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <Button type="submit" size="sm" disabled={form.processing}>
                        {form.processing ? 'Saving…' : 'Save'}
                    </Button>
                    {Object.keys(form.errors).length > 0 && (
                        <ul className="text-sm text-red-600 dark:text-red-400">
                            {Object.entries(form.errors).map(([k, v]) => (
                                <li key={k}>{v}</li>
                            ))}
                        </ul>
                    )}
                </form>
                )}
            </CardContent>
        </Card>
    );
}
