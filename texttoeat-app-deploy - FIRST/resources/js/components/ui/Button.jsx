import { clsx } from 'clsx';

const variantClasses = {
    primary:
        'bg-primary text-white hover:opacity-90 transition-all',
    secondary:
        'bg-primary/10 text-primary hover:bg-primary/20 transition-all',
    outline:
        'border-2 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all',
    destructive:
        'bg-destructive text-white hover:opacity-90 transition-all',
    ghost:
        'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all',
    disabled:
        'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600',
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
