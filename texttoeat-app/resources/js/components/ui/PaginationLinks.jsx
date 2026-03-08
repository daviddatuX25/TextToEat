import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../../utils/formatNumber';

/**
 * Shared pagination footer: "from–to of total" text + Prev/Next/page links.
 * @param {{ meta?: { from?: number, to?: number, total?: number, last_page?: number } | null, links?: Array<{ url: string | null, label: string, active?: boolean }>, itemLabel?: string, fallbackTotal?: number }} props
 *   When meta is null, pass fallbackTotal to show "X items" (e.g. for unpaginated lists).
 */
export function PaginationLinks({ meta = null, links = [], itemLabel = 'order', fallbackTotal = null }) {
    const total = meta?.total ?? 0;
    const from = meta?.from ?? 0;
    const to = meta?.to ?? 0;
    const lastPage = meta?.last_page ?? 1;
    const showPager = lastPage > 1 && Array.isArray(links) && links.length > 0;

    const rangeText =
        meta != null
            ? `${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)} ${itemLabel}${total !== 1 ? 's' : ''}`
            : fallbackTotal != null
                ? `${formatNumber(fallbackTotal)} ${itemLabel}${fallbackTotal !== 1 ? 's' : ''}`
                : null;

    const renderLabel = (label) => {
        if (label === '&laquo; Previous') return <ChevronLeft className="h-4 w-4" />;
        if (label === 'Next &raquo;') return <ChevronRight className="h-4 w-4" />;
        return label;
    };

    return (
        <>
            {rangeText != null && <span>{rangeText}</span>}
            {showPager && (
                <nav className="flex items-center gap-1" aria-label="Pagination">
                    {links.map((link, i) => {
                        const url = link.url;
                        const isDisabled = !url;
                        const isActive = link.active;
                        const label = link.label;
                        const content = renderLabel(label);
                        if (isDisabled) {
                            return (
                                <span
                                    key={i}
                                    aria-disabled="true"
                                    className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-medium rounded-lg border border-surface-200 dark:border-surface-600 text-surface-400 dark:text-surface-500 cursor-not-allowed"
                                >
                                    {content}
                                </span>
                            );
                        }
                        return (
                            <Link
                                key={i}
                                href={url}
                                className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-medium rounded-lg border transition-colors ${
                                    isActive
                                        ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                                        : 'border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
                                }`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {content}
                            </Link>
                        );
                    })}
                </nav>
            )}
        </>
    );
}
