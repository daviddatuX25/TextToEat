import { useState, useEffect, useRef, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, PageHeader, InfoTooltip } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Settings as SettingsIcon, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

const PREVIEW_URL = '/portal/menu-settings/preview-reset-cancellations';
const RUN_RESET_URL = '/portal/menu-settings/run-reset';

function formatServerTime(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return iso;
    }
}

export default function MenuSettings({ menu = {}, levels_reminder = {} }) {
    const { flash } = usePage().props;
    const [levelsReminderForm, setLevelsReminderForm] = useState({
        low_stock_threshold: levels_reminder.low_stock_threshold ?? 5,
        low_stock_badge_style: levels_reminder.low_stock_badge_style ?? 'count',
    });
    const [menuResetForm, setMenuResetForm] = useState({
        reset_morning_until_hour: menu?.reset_morning_until_hour ?? 11,
        auto_reset_enabled: !!menu?.auto_reset_enabled,
        auto_reset_at_hour: menu?.auto_reset_at_hour ?? menu?.reset_morning_until_hour ?? 4,
    });
    const [savingLevelsReminder, setSavingLevelsReminder] = useState(false);
    const [savingMenuReset, setSavingMenuReset] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetDialogForce, setResetDialogForce] = useState(false);
    const [resetDialogCancelUnfulfilled, setResetDialogCancelUnfulfilled] = useState(false);
    const [previewOrders, setPreviewOrders] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [runningReset, setRunningReset] = useState(false);
    const [serverTime, setServerTime] = useState(menu?.server_time ?? null);
    const lastFlashedRef = useRef({ success: null, error: null });

    useEffect(() => {
        setLevelsReminderForm({
            low_stock_threshold: levels_reminder.low_stock_threshold ?? 5,
            low_stock_badge_style: levels_reminder.low_stock_badge_style ?? 'count',
        });
    }, [levels_reminder.low_stock_threshold, levels_reminder.low_stock_badge_style]);

    useEffect(() => {
        setMenuResetForm({
            reset_morning_until_hour: menu?.reset_morning_until_hour ?? 11,
            auto_reset_enabled: !!menu?.auto_reset_enabled,
            auto_reset_at_hour: menu?.auto_reset_at_hour ?? menu?.reset_morning_until_hour ?? 4,
        });
        if (menu?.server_time) setServerTime(menu.server_time);
    }, [menu?.reset_morning_until_hour, menu?.auto_reset_enabled, menu?.auto_reset_at_hour, menu?.server_time]);

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

    const fetchPreview = useCallback(async () => {
        setLoadingPreview(true);
        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
            const res = await fetch(PREVIEW_URL, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}) },
                credentials: 'same-origin',
            });
            const data = await res.json();
            if (res.ok) setPreviewOrders(data);
            else setPreviewOrders({ count: 0, orders: [] });
        } catch {
            setPreviewOrders({ count: 0, orders: [] });
        } finally {
            setLoadingPreview(false);
        }
    }, []);

    useEffect(() => {
        if (resetDialogOpen && resetDialogCancelUnfulfilled && previewOrders == null) fetchPreview();
        if (!resetDialogCancelUnfulfilled) setPreviewOrders(null);
    }, [resetDialogOpen, resetDialogCancelUnfulfilled, previewOrders, fetchPreview]);

    const saveLevelsReminder = (e) => {
        e.preventDefault();
        setSavingLevelsReminder(true);
        router.patch('/portal/menu-settings', {
            menu: {
                low_stock_threshold: Number(levelsReminderForm.low_stock_threshold),
                low_stock_badge_style: levelsReminderForm.low_stock_badge_style,
            },
        }, {
            preserveScroll: true,
            onFinish: () => setSavingLevelsReminder(false),
        });
    };

    const saveMenuResetSettings = (e) => {
        e.preventDefault();
        setSavingMenuReset(true);
        router.patch('/portal/menu-settings', {
            menu: {
                reset_morning_until_hour: Number(menuResetForm.reset_morning_until_hour),
                auto_reset_enabled: menuResetForm.auto_reset_enabled,
                auto_reset_at_hour: Number(menuResetForm.auto_reset_at_hour),
            },
        }, {
            preserveScroll: true,
            onFinish: () => setSavingMenuReset(false),
        });
    };

    const runReset = () => {
        setRunningReset(true);
        router.post(RUN_RESET_URL, {
            force: resetDialogForce,
            cancel_previous_unfulfilled: resetDialogCancelUnfulfilled,
        }, {
            preserveScroll: true,
            onFinish: () => setRunningReset(false),
            onSuccess: () => {
                setResetDialogOpen(false);
                setResetDialogForce(false);
                setResetDialogCancelUnfulfilled(false);
                setPreviewOrders(null);
            },
        });
    };

    const lastResetDate = menu?.last_reset_date ?? null;

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in pt-2 pb-12">
                <PageHeader
                    title={
                        <>
                            <SettingsIcon className="h-9 w-9 text-primary-500" />
                            Menu settings
                        </>
                    }
                    titleClassName="flex items-center gap-3"
                    description="Daily menu reset and low-stock reminder for Today's servings."
                />

                {/* Menu & daily reset */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Menu & daily reset
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-6 pb-5 space-y-4">
                        <p className="text-sm text-surface-600 dark:text-surface-400 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-surface-500" />
                            <span className="font-medium text-surface-800 dark:text-surface-200">Current time (server):</span>{' '}
                            {formatServerTime(serverTime)}
                        </p>
                        <form onSubmit={saveMenuResetSettings} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Morning cutoff hour (0–23)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={menuResetForm.reset_morning_until_hour}
                                    onChange={(e) => setMenuResetForm((prev) => ({ ...prev, reset_morning_until_hour: e.target.value }))}
                                />
                                <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">Manual reset is only allowed before this hour unless you override.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="auto_reset_enabled"
                                    checked={menuResetForm.auto_reset_enabled}
                                    onChange={(e) => setMenuResetForm((prev) => ({ ...prev, auto_reset_enabled: e.target.checked }))}
                                    className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                />
                                <label htmlFor="auto_reset_enabled" className="text-sm font-medium text-surface-700 dark:text-surface-300">Enable automatic reset at the set hour</label>
                            </div>
                            {menuResetForm.auto_reset_enabled && (
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Auto-reset at hour (0–23)</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={23}
                                        value={menuResetForm.auto_reset_at_hour}
                                        onChange={(e) => setMenuResetForm((prev) => ({ ...prev, auto_reset_at_hour: e.target.value }))}
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                                <Button type="submit" disabled={savingMenuReset}>
                                    {savingMenuReset ? 'Saving…' : 'Save reset settings'}
                                </Button>
                            </div>
                        </form>
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                            <span className="font-medium text-surface-800 dark:text-surface-200">Last reset date:</span>{' '}
                            {lastResetDate ? lastResetDate : 'Not run today.'}
                        </p>
                        <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setResetDialogOpen(true)}
                                className="gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Reset menu now (move to next day)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) { setResetDialogCancelUnfulfilled(false); setResetDialogForce(false); setPreviewOrders(null); } }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Reset menu now</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                            This will roll over yesterday&apos;s menu to today and reset today&apos;s quantities. Unfulfilled orders are not changed unless you opt in below.
                        </p>
                        <div className="flex items-start gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="cancel_previous_unfulfilled"
                                checked={resetDialogCancelUnfulfilled}
                                onChange={(e) => setResetDialogCancelUnfulfilled(e.target.checked)}
                                className="h-4 w-4 mt-0.5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                                <label htmlFor="cancel_previous_unfulfilled" className="text-sm font-medium text-surface-700 dark:text-surface-300 cursor-pointer">
                                    Also cancel unfulfilled orders from previous days (received, preparing, ready)
                                </label>
                                {resetDialogCancelUnfulfilled && (
                                    <div className="mt-2 text-xs text-surface-500 dark:text-surface-500">
                                        {loadingPreview ? (
                                            <span>Loading…</span>
                                        ) : previewOrders?.count != null ? (
                                            previewOrders.count === 0 ? (
                                                <span>No such orders.</span>
                                            ) : (
                                                <span>{previewOrders.count} order(s) will be cancelled: {previewOrders.orders?.map((o) => o.reference).filter(Boolean).join(', ') || '—'}</span>
                                            )
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="reset_force"
                                checked={resetDialogForce}
                                onChange={(e) => setResetDialogForce(e.target.checked)}
                                className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="reset_force" className="text-sm font-medium text-surface-700 dark:text-surface-300">Run even after cutoff</label>
                        </div>
                        <DialogFooter className="gap-2 pt-4">
                            <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={runningReset}>
                                Cancel
                            </Button>
                            <Button onClick={runReset} disabled={runningReset}>
                                {runningReset ? 'Running…' : 'Confirm reset'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Levels reminder */}
                <Card className="rounded-2xl border-surface-200 dark:border-surface-700 overflow-hidden">
                    <CardHeader className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/40 px-6 py-5">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 inline-flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Levels reminder
                        </p>
                    </CardHeader>
                    <CardContent className="px-6 pt-6 pb-5">
                        <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                            When a meal&apos;s available stock is below the threshold, a badge appears on &quot;Today&apos;s menu&quot; in the sidebar. Use a threshold of 1 to be notified when any item is at zero.
                        </p>
                        <form onSubmit={saveLevelsReminder} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Notify when available stock is below</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={1000}
                                    value={levelsReminderForm.low_stock_threshold}
                                    onChange={(e) => setLevelsReminderForm((prev) => ({ ...prev, low_stock_threshold: e.target.value }))}
                                />
                                <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">Meals with available quantity below this number will trigger the badge.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Badge</label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="low_stock_badge_style"
                                            value="count"
                                            checked={levelsReminderForm.low_stock_badge_style === 'count'}
                                            onChange={(e) => setLevelsReminderForm((prev) => ({ ...prev, low_stock_badge_style: e.target.value }))}
                                            className="h-4 w-4 border-surface-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-surface-700 dark:text-surface-300">Show count of meals below level</span>
                                        <InfoTooltip
                                            content="The sidebar badge shows the exact number of meals whose available stock is below the threshold (e.g. 3 if three meals are low)."
                                            side="top"
                                        />
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="low_stock_badge_style"
                                            value="one"
                                            checked={levelsReminderForm.low_stock_badge_style === 'one'}
                                            onChange={(e) => setLevelsReminderForm((prev) => ({ ...prev, low_stock_badge_style: e.target.value }))}
                                            className="h-4 w-4 border-surface-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-surface-700 dark:text-surface-300">Show 1 when any meal is below level</span>
                                        <InfoTooltip
                                            content="The sidebar badge shows 1 whenever at least one meal is below the threshold, so you're alerted without seeing the exact count."
                                            side="top"
                                        />
                                    </label>
                                </div>
                            </div>
                            <Button type="submit" disabled={savingLevelsReminder}>
                                {savingLevelsReminder ? 'Saving…' : 'Save levels reminder'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </section>
        </PortalLayout>
    );
}
