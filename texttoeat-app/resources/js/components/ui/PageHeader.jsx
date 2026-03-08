import { TypewriterText } from './TypewriterText';

/**
 * Canonical admin page header: title, optional actions, and typewriter description.
 * Use for consistent header + description across portal pages.
 */
export function PageHeader({ title, description, children, titleClassName = '' }) {
    const h1Class =
        'text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white ' +
        (titleClassName || '');
    return (
        <header className="space-y-3">
            <div
                className={
                    children
                        ? 'flex flex-wrap items-center justify-between gap-4'
                        : undefined
                }
            >
                <h1 className={h1Class.trim()}>
                    {title}
                </h1>
                {children}
            </div>
            {description != null && description !== '' && (
                <p className="text-surface-500 dark:text-surface-400 text-sm [text-shadow:0_1px_2px_rgb(255_255_255_/_0.8),0_1px_3px_rgb(0_0_0_/_0.08)] dark:[text-shadow:0_1px_2px_rgb(0_0_0_/_0.4)]">
                    <TypewriterText text={description} />
                </p>
            )}
        </header>
    );
}
