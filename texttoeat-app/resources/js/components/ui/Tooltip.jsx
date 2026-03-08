import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx } from 'clsx';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipPortal = TooltipPrimitive.Portal;

function TooltipContent({ className, sideOffset = 4, side = 'top', ...props }) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                sideOffset={sideOffset}
                side={side}
                className={clsx(
                    'z-50 max-w-xs rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-700 shadow-md dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200',
                    className
                )}
                {...props}
            />
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
