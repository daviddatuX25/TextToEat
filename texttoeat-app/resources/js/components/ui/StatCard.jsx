import { clsx } from 'clsx';
import { Card } from './Card';

export function StatCard({ label, value, helperText, tone = 'default', className, ...props }) {
    const toneClasses = {
        default: 'border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40',
        primary: 'border-primary-200 bg-primary-50/60 dark:border-primary-500/40 dark:bg-primary-500/10',
        success: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10',
        warning: 'border-amber-200 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10',
    };

    const toneClassName = toneClasses[tone] ?? toneClasses.default;

    return (
        <Card
            className={clsx(
                'h-full border rounded-2xl shadow-none px-4 py-3 sm:px-5 sm:py-4 flex flex-col justify-between',
                toneClassName,
                className
            )}
            {...props}
        >
            <div className="space-y-1">
                {label && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                        {label}
                    </p>
                )}
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                    {value}
                </p>
            </div>
            {helperText && (
                <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                    {helperText}
                </p>
            )}
        </Card>
    );
}

