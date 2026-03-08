import { clsx } from 'clsx';
import { Card } from './Card';

export function StatCard({
    label,
    value,
    helperText,
    subValue,
    trend,
    trendUpIsGood = true,
    tone = 'default',
    className,
    ...props
}) {
    const toneClasses = {
        default: 'border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40',
        primary: 'border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40',
        success: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10',
        warning: 'border-amber-200 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10',
    };

    const toneClassName = toneClasses[tone] ?? toneClasses.default;
    const trendPositive = trend != null && trend !== '' && (trendUpIsGood ? Number(trend) > 0 : Number(trend) < 0);
    const trendNegative = trend != null && trend !== '' && (trendUpIsGood ? Number(trend) < 0 : Number(trend) > 0);

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
                {subValue != null && subValue !== '' && (
                    <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                        {subValue}
                    </p>
                )}
                {trend != null && trend !== '' && (
                    <p
                        className={clsx(
                            'text-xs font-medium',
                            trendPositive && 'text-emerald-600 dark:text-emerald-400',
                            trendNegative && 'text-rose-600 dark:text-rose-400',
                            !trendPositive && !trendNegative && 'text-surface-500 dark:text-surface-400'
                        )}
                    >
                        {typeof trend === 'string' ? trend : `${Number(trend) > 0 ? '+' : ''}${trend}%`}
                    </p>
                )}
            </div>
            {helperText && (
                <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                    {helperText}
                </p>
            )}
        </Card>
    );
}

