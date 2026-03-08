import { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { Card, CardContent, CardHeader, PageHeader, InfoTooltip } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings as SettingsIcon, RefreshCw, AlertTriangle } from 'lucide-react';

export default function MenuSettings({ menu = {}, levels_reminder = {} }) {
    const { flash } = usePage().props;
    const [levelsReminderForm, setLevelsReminderForm] = useState({
        low_stock_threshold: levels_reminder.low_stock_threshold ?? 5,
        low_stock_badge_style: levels_reminder.low_stock_badge_style ?? 'count',
    });
    const [savingLevelsReminder, setSavingLevelsReminder] = useState(false);
    const lastFlashedRef = useRef({ success: null, error: null });

    useEffect(() => {
        setLevelsReminderForm({
            low_stock_threshold: levels_reminder.low_stock_threshold ?? 5,
            low_stock_badge_style: levels_reminder.low_stock_badge_style ?? 'count',
        });
    }, [levels_reminder.low_stock_threshold, levels_reminder.low_stock_badge_style]);

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

    const lastResetDate = menu?.last_reset_date ?? null;
    const resetHour = menu?.reset_morning_until_hour ?? 11;

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
                    <CardContent className="px-6 pt-6 pb-5 space-y-3">
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                            <span className="font-medium text-surface-800 dark:text-surface-200">Morning cutoff hour:</span> {resetHour} — the daily menu reset is only allowed before this hour.
                        </p>
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                            <span className="font-medium text-surface-800 dark:text-surface-200">Last reset date:</span>{' '}
                            {lastResetDate ? lastResetDate : 'Not run today.'}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-500">
                            The daily menu is reset automatically each night. To change the cutoff hour or how the reset is scheduled, contact your developer or hosting provider.
                        </p>
                    </CardContent>
                </Card>

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
