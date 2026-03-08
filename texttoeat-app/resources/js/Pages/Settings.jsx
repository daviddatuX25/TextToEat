import { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, PageHeader } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    Settings as SettingsIcon,
    Clock,
    Radio,
    Type,
    Link as LinkIcon,
    MessageCircle,
    MessageSquare,
    Smartphone,
} from 'lucide-react';

const PORTAL_FONT_SIZE_KEY = 'portalFontSize';

function Toggle({ checked, onToggle, disabled, label }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer">
            <span className="relative inline-flex h-6 w-11 shrink-0 rounded-full border border-surface-200 dark:border-surface-600 transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-surface-900">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onToggle(e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                />
                <span
                    className={`block h-5 w-5 rounded-full bg-white dark:bg-surface-200 shadow-sm transform transition-transform mt-0.5 ml-0.5 peer-checked:translate-x-5 peer-checked:bg-primary-600 peer-disabled:opacity-50 ${
                        !checked ? 'bg-surface-200 dark:bg-surface-600' : ''
                    }`}
                />
            </span>
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</span>
        </label>
    );
}

export default function Settings({
    timeouts = {},
    channel_mode = 'sim',
    channels = {},
    quick_links = [],
}) {
    const { flash } = usePage().props;
    const [channelForm, setChannelForm] = useState({
        sms_enabled: channels.sms_enabled ?? true,
        messenger_enabled: channels.messenger_enabled ?? true,
        web_enabled: channels.web_enabled ?? true,
    });
    const [savingChannels, setSavingChannels] = useState(false);
    const [timeoutForm, setTimeoutForm] = useState({
        takeover_timeout_minutes: timeouts.takeover_timeout_minutes ?? 60,
        session_timeout_seconds: timeouts.session_timeout_seconds ?? 60,
        pending_timeout_minutes: timeouts.pending_timeout_minutes ?? 10,
        heartbeat_interval_minutes: timeouts.heartbeat_interval_minutes ?? 15,
    });
    const [savingTimeouts, setSavingTimeouts] = useState(false);
    const [fontSize, setFontSizeState] = useState(() => localStorage.getItem(PORTAL_FONT_SIZE_KEY) || 'medium');

    useEffect(() => {
        setTimeoutForm({
            takeover_timeout_minutes: timeouts.takeover_timeout_minutes ?? 60,
            session_timeout_seconds: timeouts.session_timeout_seconds ?? 60,
            pending_timeout_minutes: timeouts.pending_timeout_minutes ?? 10,
            heartbeat_interval_minutes: timeouts.heartbeat_interval_minutes ?? 15,
        });
    }, [timeouts.takeover_timeout_minutes, timeouts.session_timeout_seconds, timeouts.pending_timeout_minutes, timeouts.heartbeat_interval_minutes]);

    useEffect(() => {
        setChannelForm({
            sms_enabled: channels.sms_enabled ?? true,
            messenger_enabled: channels.messenger_enabled ?? true,
            web_enabled: channels.web_enabled ?? true,
        });
    }, [channels.sms_enabled, channels.messenger_enabled, channels.web_enabled]);

    const lastFlashedRef = useRef({ success: null, error: null });
    useEffect(() => {
        if (flash?.success != null && flash.success !== lastFlashedRef.current.success) {
            lastFlashedRef.current.success = flash.success;
            toast.success(flash.success);
        }
        if (flash?.error != null && flash.error !== lastFlashedRef.current.error) {
            lastFlashedRef.current.error = flash.error;
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const setFontSize = (size) => {
        setFontSizeState(size);
        localStorage.setItem(PORTAL_FONT_SIZE_KEY, size);
        document.documentElement.classList.remove('portal-font-small', 'portal-font-medium', 'portal-font-large');
        document.documentElement.classList.add(`portal-font-${size}`);
    };

    useEffect(() => {
        document.documentElement.classList.remove('portal-font-small', 'portal-font-medium', 'portal-font-large');
        document.documentElement.classList.add(`portal-font-${fontSize}`);
    }, [fontSize]);

    const saveChannels = () => {
        setSavingChannels(true);
        router.patch('/portal/settings', {
            channels: {
                sms_enabled: channelForm.sms_enabled,
                messenger_enabled: channelForm.messenger_enabled,
                web_enabled: channelForm.web_enabled,
            },
        }, {
            preserveScroll: true,
            onFinish: () => setSavingChannels(false),
        });
    };

    const saveTimeouts = (e) => {
        e.preventDefault();
        setSavingTimeouts(true);
        router.patch('/portal/settings', {
            chatbot: {
                takeover_timeout_minutes: Number(timeoutForm.takeover_timeout_minutes),
                session_timeout_seconds: Number(timeoutForm.session_timeout_seconds),
            },
            firebase: {
                pending_timeout_minutes: Number(timeoutForm.pending_timeout_minutes),
                heartbeat_interval_minutes: Number(timeoutForm.heartbeat_interval_minutes),
            },
        }, {
            preserveScroll: true,
            onFinish: () => setSavingTimeouts(false),
        });
    };

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in pt-2 pb-12">
                <PageHeader
                    title={
                        <>
                            <SettingsIcon className="h-9 w-9 text-primary-500" />
                            Settings
                        </>
                    }
                    titleClassName="flex items-center gap-3"
                    description="Turn channels on or off, adjust how the portal looks, and jump to Facebook Messenger or SMS setup. For technical changes (e.g. timeouts, server schedule), contact your developer."
                />

                {/* Timeouts (editable) */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Chatbot & SMS timeouts
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-6 pb-5">
                        <form onSubmit={saveTimeouts} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Takeover timeout (min)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    value={timeoutForm.takeover_timeout_minutes}
                                    onChange={(e) => setTimeoutForm((prev) => ({ ...prev, takeover_timeout_minutes: e.target.value }))}
                                />
                                <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">After this many minutes of inactivity, takeover sessions return to bot mode.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Session timeout (sec)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={86400}
                                    value={timeoutForm.session_timeout_seconds}
                                    onChange={(e) => setTimeoutForm((prev) => ({ ...prev, session_timeout_seconds: e.target.value }))}
                                />
                                <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">Chat session is considered inactive after this many seconds.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">SMS pending timeout (min)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    value={timeoutForm.pending_timeout_minutes}
                                    onChange={(e) => setTimeoutForm((prev) => ({ ...prev, pending_timeout_minutes: e.target.value }))}
                                />
                                <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">Pending outbound SMS are marked failed after this many minutes.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Device heartbeat interval (min)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    value={timeoutForm.heartbeat_interval_minutes}
                                    onChange={(e) => setTimeoutForm((prev) => ({ ...prev, heartbeat_interval_minutes: e.target.value }))}
                                />
                                <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">How often the app requests status from SMS devices.</p>
                            </div>
                            <Button type="submit" disabled={savingTimeouts}>
                                {savingTimeouts ? 'Saving…' : 'Save timeouts'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Channel mode */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <Radio className="h-4 w-4" />
                            Channel mode
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-6 pb-5">
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                            <span className="font-medium text-surface-800 dark:text-surface-200 capitalize">{channel_mode}</span> — {channel_mode === 'prod' ? 'Live SMS and Messenger are used.' : 'Simulator mode; live SMS and Messenger are not used.'} To switch to live or simulator mode, contact your developer.
                        </p>
                    </CardContent>
                </Card>

                {/* Channel enable/disable */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <Radio className="h-4 w-4" />
                            Channels
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-6 pb-5 space-y-4">
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                            Enable or disable each ordering channel. When disabled, that channel will not accept new orders.
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-500">
                            These apply in both simulator and live mode so you can test disabling a channel in the chat simulator or web ordering.
                        </p>
                        <div className="flex flex-col gap-4">
                            <Toggle
                                label="SMS"
                                checked={channelForm.sms_enabled}
                                onToggle={(v) => setChannelForm((prev) => ({ ...prev, sms_enabled: v }))}
                            />
                            <Toggle
                                label="Facebook Messenger"
                                checked={channelForm.messenger_enabled}
                                onToggle={(v) => setChannelForm((prev) => ({ ...prev, messenger_enabled: v }))}
                            />
                            <Toggle
                                label="Web"
                                checked={channelForm.web_enabled}
                                onToggle={(v) => setChannelForm((prev) => ({ ...prev, web_enabled: v }))}
                            />
                        </div>
                        <Button onClick={saveChannels} disabled={savingChannels} className="mt-2">
                            {savingChannels ? 'Saving…' : 'Save channel settings'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Portal UI — font size */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <Type className="h-4 w-4" />
                            Portal text size
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-6 pb-5">
                        <p className="text-sm text-surface-600 dark:text-surface-400 mb-3">
                            Choose text size for the portal (this device only).
                        </p>
                        <div className="flex gap-2">
                            {['small', 'medium', 'large'].map((size) => (
                                <Button
                                    key={size}
                                    variant={fontSize === size ? 'primary' : 'outline'}
                                    className="!px-4 !py-2 text-sm"
                                    onClick={() => setFontSize(size)}
                                >
                                    {size.charAt(0).toUpperCase() + size.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick links */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            Quick links
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-6 pb-5">
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {quick_links.map((link) => (
                                <li key={link.href}>
                                    <a
                                        href={link.href}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                    >
                                        {link.label === 'Reply templates' && <MessageSquare className="h-4 w-4" />}
                                        {link.label === 'SMS devices' && <Smartphone className="h-4 w-4" />}
                                        {link.label === 'Facebook Messenger' && <MessageCircle className="h-4 w-4" />}
                                        {link.label === 'Manage users' && <SettingsIcon className="h-4 w-4" />}
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </section>
        </PortalLayout>
    );
}
