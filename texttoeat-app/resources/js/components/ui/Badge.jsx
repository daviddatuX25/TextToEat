import { clsx } from 'clsx';

const variantClasses = {
    success: 'bg-success/10 text-success',
    warning: 'bg-accent/10 text-accent',
    error: 'bg-destructive/10 text-destructive',
    neutral: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
    premium: 'bg-primary-600/95 text-white dark:bg-primary-500/95 dark:text-white',
};

const sizeClasses = {
    default: 'px-3 py-1 text-xs',
    sm: 'min-w-[1.25rem] px-1.5 py-0 text-[10px]',
};

export function Badge({ variant = 'neutral', size = 'default', className, children, ...props }) {
    return (
        <span
            className={clsx(
                'inline-flex items-center justify-center gap-1 rounded-full font-bold uppercase tracking-wider',
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
