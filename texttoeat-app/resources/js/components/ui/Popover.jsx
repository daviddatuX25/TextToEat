import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { clsx } from 'clsx';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef(
    (
        {
            className,
            align = 'center',
            side = 'bottom',
            sideOffset = 6,
            collisionPadding = 12,
            ...props
        },
        ref
    ) => (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                ref={ref}
                align={align}
                side={side}
                sideOffset={sideOffset}
                collisionPadding={collisionPadding}
                className={clsx(
                    'z-50 rounded-xl border border-surface-200 bg-white p-4 text-surface-900 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100',
                    className
                )}
                {...props}
            />
        </PopoverPrimitive.Portal>
    )
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
