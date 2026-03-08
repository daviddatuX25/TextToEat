import { clsx } from 'clsx';

const inputBase =
    'w-full rounded-lg border px-3 py-2 text-sm font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-surface-800';
const inputDefault =
    'border-surface-200 dark:border-surface-700 placeholder:text-muted-foreground';
const inputError =
    'border-destructive focus:ring-destructive focus:border-destructive';

export function Input({
    id,
    label,
    error,
    className,
    labelClassName,
    ...props
}) {
    const hasError = Boolean(error);
    return (
        <div className="space-y-2">
            {label && (
                <label
                    htmlFor={id}
                    className={clsx(
                        'block text-sm font-bold',
                        hasError ? 'text-destructive' : 'text-foreground',
                        labelClassName
                    )}
                >
                    {label}
                </label>
            )}
            <input
                id={id}
                className={clsx(
                    inputBase,
                    hasError ? inputError : inputDefault,
                    className
                )}
                aria-invalid={hasError}
                aria-describedby={hasError && id ? `${id}-error` : undefined}
                {...props}
            />
            {hasError && (
                <p
                    id={id ? `${id}-error` : undefined}
                    className="text-xs font-medium text-destructive"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
