import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip';

/**
 * Small info icon that shows a tooltip on hover/focus with beginner-friendly explanation.
 */
export function InfoTooltip({ content, side = 'top', className }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className={`inline-flex cursor-help ${className ?? ''}`}
                    role="img"
                    aria-label="What does this mean?"
                    tabIndex={0}
                >
                    <Info className="h-4 w-4 text-surface-400 dark:text-surface-500" />
                </span>
            </TooltipTrigger>
            <TooltipContent side={side} className="max-w-[280px]">
                {content}
            </TooltipContent>
        </Tooltip>
    );
}
