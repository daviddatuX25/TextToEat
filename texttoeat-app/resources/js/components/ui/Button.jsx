import { clsx } from 'clsx';

const variantClasses = {
    primary:
        'bg-primary text-white hover:opacity-90 transition-all',
    secondary:
        'bg-primary/10 text-primary hover:bg-primary/20 transition-all',
    outline:
        'border-2 border-surface-200 text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800 transition-all',
    destructive:
        'bg-destructive text-white hover:opacity-90 transition-all',
    ghost:
        'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 transition-all',
    disabled:
        'bg-surface-200 text-surface-400 cursor-not-allowed dark:bg-surface-800 dark:text-surface-600',
};

export function Button({
    variant = 'primary',
    type = 'button',
    disabled = false,
    className,
    children,
    ...props
}) {
    const isDisabled = disabled || variant === 'disabled';
    const variantKey = isDisabled ? 'disabled' : variant;
    return (
        <button
            type={type}
            disabled={isDisabled}
            className={clsx(
                'inline-flex cursor-pointer items-center justify-center rounded-lg px-6 py-2.5 text-sm font-bold tracking-[0.015em]',
                variantClasses[variantKey],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
