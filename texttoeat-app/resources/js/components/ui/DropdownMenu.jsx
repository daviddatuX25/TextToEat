import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuContentPrimitive = DropdownMenuPrimitive.Content;
const DropdownMenuItemPrimitive = DropdownMenuPrimitive.Item;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuLabel = DropdownMenuPrimitive.Label;
const DropdownMenuSeparator = DropdownMenuPrimitive.Separator;

function DropdownMenuContent({ className, ...props }) {
    return (
        <DropdownMenuContentPrimitive
            className={clsx(
                'z-50 min-w-[10rem] overflow-hidden rounded-xl border border-surface-200 bg-white p-1 shadow-lg dark:border-surface-700 dark:bg-surface-900',
                className
            )}
            sideOffset={4}
            {...props}
        />
    );
}

function DropdownMenuItem({ className, ...props }) {
    return (
        <DropdownMenuItemPrimitive
            className={clsx(
                'relative flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:bg-surface-100 focus:text-surface-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-surface-800 dark:focus:text-surface-100',
                className
            )}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuPortal,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
};
