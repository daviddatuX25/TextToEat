import { clsx } from 'clsx';

const variantClasses = {
    success: 'bg-success/10 text-success',
    warning: 'bg-accent/10 text-accent',
    error: 'bg-destructive/10 text-destructive',
    neutral: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
    premium: 'bg-primary-600/95 text-white dark:bg-primary-500/95 dark:text-white',
};

export function Badge({ variant = 'neutral', className, children, ...props }) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
                variantClasses[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
