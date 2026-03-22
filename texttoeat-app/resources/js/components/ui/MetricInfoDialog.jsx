import { useState } from 'react';
import { Info } from 'lucide-react';
import { clsx } from 'clsx';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';
import { Button } from './Button';

/**
 * Info icon that opens a popover anchored to the icon with metric explanation. Single control switches EN ↔ FIL.
 */
export function MetricInfoDialog({
    titleEn,
    titleFil,
    contentEn,
    contentFil,
    triggerLabel = 'About this metric',
    className,
}) {
    const [open, setOpen] = useState(false);
    const [lang, setLang] = useState('en');

    const title = lang === 'en' ? titleEn : titleFil;
    const body = lang === 'en' ? contentEn : contentFil;
    const switchLabel = lang === 'en' ? 'Filipino' : 'English';

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setLang('en');
                }
            }}
            modal={false}
        >
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={clsx(
                        'inline-flex cursor-help rounded-md p-0.5 text-surface-400 transition hover:text-surface-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-surface-500 dark:hover:text-surface-300',
                        className
                    )}
                    aria-label={triggerLabel}
                    aria-expanded={open}
                >
                    <Info className="h-4 w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" sideOffset={8} className="flex max-h-[min(70vh,24rem)] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden p-0">
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-3">
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
                    <p className="mt-2 text-sm text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">{body}</p>
                </div>
                <div className="shrink-0 border-t border-surface-200 px-4 py-3 dark:border-surface-700">
                    <Button variant="outline" type="button" className="px-4 py-2 text-xs font-semibold" onClick={() => setLang((l) => (l === 'en' ? 'fil' : 'en'))}>
                        {switchLabel}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
