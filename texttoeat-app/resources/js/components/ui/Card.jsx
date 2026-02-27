import { clsx } from 'clsx';

export function Card({ className, hover, children, ...props }) {
    return (
        <div
            className={clsx(
                'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
                hover && 'transition-shadow hover:shadow-md',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, ...props }) {
    return <div className={clsx('p-5', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
    return <div className={clsx('p-5 pt-0', className)} {...props} />;
}
