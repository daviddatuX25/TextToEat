import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import {
    Menu,
    BarChart3,
    LayoutDashboard,
    ListOrdered,
    CheckCircle,
    Zap,
    Truck,
    Store,
    UtensilsCrossed,
    BookOpen,
    ClipboardList,
    Inbox,
    MessageCircle,
    MessageSquare,
    Settings,
    Users,
    Smartphone,
    Bot,
    User,
    LogOut,
    ChevronRight,
    ChevronDown,
    LayoutList,
} from 'lucide-react';
import { SiFacebook } from 'react-icons/si';
import { Toaster, toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/Collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/DropdownMenu';
import ThemeToggle from '../components/ThemeToggle';
import { Badge } from '../components/ui/Badge';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePortalNavBadges } from '../hooks/usePortalNavBadges';

const PORTAL_NAV_LINK_DASHBOARD = { type: 'link', href: '/portal', label: 'Dashboard', Icon: LayoutDashboard };
const PORTAL_NAV_LINK_ANALYTICS = { type: 'link', href: '/portal/analytics', label: 'Analytics & Reports', Icon: BarChart3 };
const PORTAL_NAV_GROUP_ORDERS = {
    type: 'group',
    label: 'Orders',
    Icon: ListOrdered,
    badgeKey: 'orders_group_total',
    items: [
        { href: '/portal/orders', label: 'Orders', Icon: ListOrdered, badgeKey: 'non_ready_orders' },
        { href: '/portal/orders/completed', label: 'Completed orders', Icon: CheckCircle },
        { href: '/portal/quick-orders', label: 'Create order', Icon: Zap },
        { href: '/portal/deliveries', label: 'Deliveries', Icon: Truck, badgeKey: 'ready_delivery_orders' },
        { href: '/portal/pickup', label: 'Pickup counter', Icon: Store, badgeKey: 'ready_pickup_orders' },
        { href: '/portal/walkin', label: 'Walk-in', Icon: UtensilsCrossed, badgeKey: 'ready_walkin_orders' },
        { href: '/portal/logs/orders', label: 'Order logs', Icon: ClipboardList },
    ],
};
const PORTAL_NAV_GROUP_MENU = {
    type: 'group',
    label: 'Menu',
    Icon: BookOpen,
    badgeKey: 'low_stock_meals',
    items: [
        { href: '/portal/menu-items', label: "Today's servings", Icon: BookOpen, badgeKey: 'low_stock_meals' },
        { href: '/portal/categories', label: 'Categories', Icon: LayoutList },
        { href: '/portal/menu-settings', label: 'Settings', Icon: Settings },
    ],
};
const PORTAL_NAV_GROUP_CONVERSATIONS = {
    type: 'group',
    label: 'Conversations',
    Icon: MessageCircle,
    badgeKey: 'active_conversations',
    items: [
        { href: '/portal/inbox', label: 'Conversation inbox', Icon: Inbox, badgeKey: 'active_conversations' },
        { href: '/portal/logs/chatbot', label: 'Chatbot logs', Icon: MessageCircle },
    ],
};
const PORTAL_NAV_GROUP_CHANNELS_SETTINGS = {
    type: 'group',
    label: 'Channels & settings',
    Icon: Settings,
    items: [
        { href: '/portal/settings', label: 'Settings', Icon: Settings },
        { href: '/portal/sms-devices', label: 'SMS devices', Icon: Smartphone },
        { href: '/portal/facebook-messenger', label: 'Facebook Messenger', Icon: SiFacebook },
        { href: '/portal/chatbot-replies', label: 'Reply templates', Icon: MessageSquare },
        { href: '/portal/simulate', label: 'Channel simulator', Icon: Bot },
        { href: '/portal/users', label: 'Manage users', Icon: Users },
    ],
};

function getPathname(url) {
    try {
        return new URL(url, 'http://localhost').pathname;
    } catch {
        return url;
    }
}

/** True if pathname is the main Orders page (non-ready badge resets). */
function pathnameIsOrdersPage(pathname) {
    return pathname === '/portal/orders';
}

/** True if pathname is the Pickup page (ready-pickup badge resets). */
function pathnameIsPickupPage(pathname) {
    return pathname === '/portal/pickup';
}

/** True if pathname is the Deliveries page (ready-delivery badge resets). */
function pathnameIsDeliveriesPage(pathname) {
    return pathname === '/portal/deliveries';
}

/** True if pathname is the Walk-in page (ready-walkin badge resets). */
function pathnameIsWalkinPage(pathname) {
    return pathname === '/portal/walkin';
}

/** True if pathname is conversation inbox (badge resets when visiting). */
function pathnameMatchesConversations(pathname) {
    return pathname === '/portal/inbox' || pathname.startsWith('/portal/inbox/');
}

/** True if pathname is Today's menu (low-stock badge resets when visiting). */
function pathnameIsMenuItemsPage(pathname) {
    return pathname === '/portal/menu-items' || pathname.startsWith('/portal/menu-items/');
}

/**
 * Effective nav badge counts: per-page counts with "visited" reset (show 0 when on that page).
 * orders_group_total = sum of the three order counts minus the current page's portion.
 */
function getEffectiveNavBadges(pathname, navBadges) {
    const non_ready = pathnameIsOrdersPage(pathname) ? 0 : (navBadges.non_ready_orders ?? 0);
    const ready_pickup = pathnameIsPickupPage(pathname) ? 0 : (navBadges.ready_pickup_orders ?? 0);
    const ready_delivery = pathnameIsDeliveriesPage(pathname) ? 0 : (navBadges.ready_delivery_orders ?? 0);
    const ready_walkin = pathnameIsWalkinPage(pathname) ? 0 : (navBadges.ready_walkin_orders ?? 0);
    // Group total = orders + pickup + delivery only (walk-in has its own badge, not mixed in)
    const orders_group_total = non_ready + ready_pickup + ready_delivery;
    const active_conversations = pathnameMatchesConversations(pathname) ? 0 : (navBadges.active_conversations ?? 0);
    const low_stock_meals = pathnameIsMenuItemsPage(pathname) ? 0 : (navBadges.low_stock_meals ?? 0);
    return {
        orders_group_total,
        non_ready_orders: non_ready,
        ready_pickup_orders: ready_pickup,
        ready_delivery_orders: ready_delivery,
        ready_walkin_orders: ready_walkin,
        active_conversations,
        low_stock_meals,
    };
}

function isPortalNavActive(href, pathname) {
    if (href === '/portal') return pathname === '/portal';
    if (href === '/portal/orders') return pathname === '/portal/orders';
    return pathname === href || pathname.startsWith(href + '/');
}

function isGroupActive(items, pathname) {
    return items.some((item) => isPortalNavActive(item.href, pathname));
}

function NavLink({ href, label, Icon, pathname, onClick, iconOnly, badgeCount }) {
    const isActive = isPortalNavActive(href, pathname);
    const activeClass = isActive
        ? 'text-surface-900 font-semibold dark:text-surface-100 bg-surface-200 dark:bg-surface-700'
        : 'text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-800';
    const baseClass = `flex items-center gap-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeClass}`;
    const fullClass = `${baseClass} px-3 py-2.5`;
    const iconOnlyClass = `justify-center w-10 h-10 p-0 shrink-0 ${baseClass}`;
    const ariaLabel = badgeCount > 0 ? `${label}, ${badgeCount}` : label;
    return (
        <Link
            href={href}
            onClick={onClick}
            className={iconOnly ? iconOnlyClass : fullClass}
            aria-current={isActive ? 'page' : undefined}
            title={iconOnly ? label : undefined}
            aria-label={iconOnly ? ariaLabel : undefined}
        >
            {Icon && (
                <span className="flex shrink-0 w-6 min-w-6 items-center justify-center text-[1.125rem]" aria-hidden>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                </span>
            )}
            {!iconOnly && (
                <>
                    {label}
                    {badgeCount > 0 && (
                        <Badge variant="premium" className="ml-1 shrink-0">
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </Badge>
                    )}
                </>
            )}
        </Link>
    );
}

function NavGroup({ group, pathname, onNavClick, iconOnly, badgeCount, navBadges, isAdmin }) {
    const { label, Icon, items: rawItems } = group;
    const items = (rawItems || []).filter(
        (item) => item.href !== '/portal/menu-settings' || isAdmin
    );
    const isActive = isGroupActive(items, pathname);
    const [userOpen, setUserOpen] = useState(() => isGroupActive(items, pathname));
    useEffect(() => {
        if (isActive) setUserOpen(true);
    }, [isActive]);
    const open = userOpen;
    const activeTriggerClass = isActive
        ? 'text-surface-900 font-semibold dark:text-surface-100 bg-surface-200 dark:bg-surface-700'
        : 'text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-800';
    const badgeLabel = badgeCount > 0 ? `${label}, ${badgeCount} active` : label;

    if (iconOnly) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger
                    className={`relative flex justify-center w-10 h-10 shrink-0 items-center rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${activeTriggerClass}`}
                    aria-label={badgeLabel}
                    title={badgeLabel}
                >
                    {Icon && <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />}
                    {badgeCount > 0 && (
                        <Badge variant="premium" size="sm" className="absolute -top-0.5 -right-0.5">
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </Badge>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="min-w-[12rem]">
                    {items.map((item) => {
                        const itemBadgeCount = item.badgeKey != null && navBadges ? (navBadges[item.badgeKey] ?? 0) : 0;
                        return (
                            <DropdownMenuItem key={item.href} asChild>
                                <Link
                                    href={item.href}
                                    onClick={onNavClick}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                                        isPortalNavActive(item.href, pathname)
                                            ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                                            : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800'
                                    }`}
                                >
                                    {item.Icon && <item.Icon className="h-4 w-4 shrink-0" strokeWidth={2} />}
                                    {item.label}
                                    {itemBadgeCount > 0 && (
                                        <Badge variant="premium" size="sm" className="ml-auto shrink-0">
                                            {itemBadgeCount > 99 ? '99+' : itemBadgeCount}
                                        </Badge>
                                    )}
                                </Link>
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <Collapsible open={open} onOpenChange={setUserOpen} className="group/collapsible">
            <CollapsibleTrigger
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-[color,transform] duration-150 whitespace-nowrap active:scale-[0.98] ${activeTriggerClass}`}
                aria-expanded={open}
                aria-label={badgeLabel}
            >
                {Icon && (
                    <span className="flex shrink-0 w-6 min-w-6 items-center justify-center text-[1.125rem]" aria-hidden>
                        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                    </span>
                )}
                {label}
                {badgeCount > 0 && (
                    <Badge variant="premium" className="ml-1 shrink-0">
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </Badge>
                )}
                <span className="ml-auto flex shrink-0" aria-hidden>
                    <ChevronRight className="h-5 w-5 group-data-[state=open]/collapsible:hidden" />
                    <ChevronDown className="h-5 w-5 hidden group-data-[state=open]/collapsible:block" />
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="flex flex-col gap-1 pl-4 pt-1">
                    {items.map((item) => (
                        <NavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            Icon={item.Icon}
                            pathname={pathname}
                            onClick={onNavClick}
                            iconOnly={false}
                            badgeCount={item.badgeKey != null && navBadges ? (navBadges[item.badgeKey] ?? 0) : undefined}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function SidebarContent({ navEntries, pathname, onNavClick, iconOnly, navBadges, isAdmin }) {
    return (
        <>
            <div
                className={`border-b border-surface-200 dark:border-surface-800 ${
                    iconOnly ? 'flex justify-center px-0 py-4' : 'flex items-center gap-3 px-4 py-5'
                }`}
            >
                <Link
                    href="/"
                    onClick={onNavClick}
                    className={iconOnly ? 'flex shrink-0 rounded-lg transition-opacity hover:opacity-90' : 'flex items-center gap-3 rounded-lg transition-opacity hover:opacity-90'}
                    title="Go to homepage"
                    aria-label="Lacasandile Eatery – go to homepage"
                >
                    <img
                        src="/images/lacasandile-logo.png"
                        alt="Lacasandile Eatery"
                        className={`shrink-0 rounded-xl object-cover ${iconOnly ? 'h-9 w-9' : 'h-10 w-10'}`}
                    />
                    {!iconOnly && (
                        <div className="min-w-0">
                            <span className="block text-lg font-bold leading-tight tracking-tight">Lacasandile Eatery</span>
                            <span className="block text-xs font-medium text-surface-500 dark:text-surface-400">powered by TextToEat</span>
                        </div>
                    )}
                </Link>
            </div>
            <nav className={`flex flex-col overflow-y-auto flex-1 ${iconOnly ? 'items-center gap-1 p-2' : 'gap-1 p-4'}`}>
                {navEntries.map((entry) => {
                    if (entry.type === 'link') {
                        return (
                            <NavLink
                                key={entry.href}
                                href={entry.href}
                                label={entry.label}
                                Icon={entry.Icon}
                                pathname={pathname}
                                onClick={onNavClick}
                                iconOnly={iconOnly}
                                badgeCount={entry.badgeKey != null ? (navBadges[entry.badgeKey] ?? 0) : undefined}
                            />
                        );
                    }
                    return (
                        <NavGroup
                            key={entry.label}
                            group={entry}
                            pathname={pathname}
                            onNavClick={onNavClick}
                            iconOnly={iconOnly}
                            badgeCount={entry.badgeKey != null ? (navBadges[entry.badgeKey] ?? 0) : undefined}
                            navBadges={navBadges}
                            isAdmin={isAdmin}
                        />
                    );
                })}
            </nav>
            <div
                className={`border-t border-surface-200 dark:border-surface-800 ${
                    iconOnly ? 'flex flex-col items-center gap-2 p-2' : 'p-4 space-y-2'
                }`}
            >
                <Link
                    href="/portal/account"
                    onClick={onNavClick}
                    title="Account"
                    aria-label="Account"
                    className={`rounded-lg transition-colors ${
                        pathname === '/portal/account'
                            ? 'border-surface-500 bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
                            : 'border-surface-200 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800'
                    } ${iconOnly ? 'flex h-10 w-10 shrink-0 items-center justify-center border-2' : 'flex items-center gap-2 border-2 px-3 py-2 text-xs font-bold'}`}
                >
                    <User className="h-4 w-4" strokeWidth={2} />
                    {!iconOnly && 'Account'}
                </Link>
                <div className={iconOnly ? 'flex flex-col items-center gap-1' : 'flex items-center gap-2'}>
                    <ThemeToggle size={18} />
                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        title="Log out"
                        aria-label="Log out"
                        className={iconOnly ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-surface-200 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800' : 'flex-1 rounded-lg border-2 border-surface-200 px-3 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800'}
                    >
                        {iconOnly ? <LogOut className="h-[18px] w-[18px]" strokeWidth={2} /> : 'Log out'}
                    </button>
                </div>
            </div>
        </>
    );
}

export default function PortalLayout({ children }) {
    const { auth, flash, show_daily_greeting } = usePage().props;
    const pageUrl = usePage().url;
    const pathname = getPathname(pageUrl);
    const isAdmin = auth?.user?.is_admin === true;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (flash?.error) toast.error(flash.error);
        if (flash?.success) toast.success(flash.success);
    }, [flash?.error, flash?.success]);

    const navEntries = useMemo(
        () => [
            PORTAL_NAV_LINK_DASHBOARD,
            PORTAL_NAV_LINK_ANALYTICS,
            PORTAL_NAV_GROUP_ORDERS,
            PORTAL_NAV_GROUP_MENU,
            PORTAL_NAV_GROUP_CONVERSATIONS,
            ...(isAdmin ? [PORTAL_NAV_GROUP_CHANNELS_SETTINGS] : []),
        ],
        [isAdmin]
    );

    const closeSidebar = () => setSidebarOpen(false);
    const openSidebar = () => setSidebarOpen(true);

    const railVisible = useMediaQuery('(min-width: 768px)');
    const fullSidebar = useMediaQuery('(min-width: 1024px)');
    const iconOnly = railVisible && !fullSidebar;
    const navBadges = usePortalNavBadges();

    const handleDismissGreeting = () => {
        router.post('/portal/dismiss-daily-greeting');
    };

    return (
        <div className="flex min-h-screen w-full bg-surface-50 text-surface-900 transition-colors duration-500 selection:bg-primary-500 selection:text-white dark:bg-surface-900 dark:text-surface-50 antialiased overflow-x-hidden">
            <Toaster richColors position="top-right" />

            <Dialog open={!!show_daily_greeting} onOpenChange={() => {}}>
                <DialogContent
                    className="max-w-sm"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Good morning!</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                        Today&apos;s menu has been reset. Enable items and set quantities as needed.
                    </p>
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleDismissGreeting}>Go to menu</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Mobile overlay: only when drawer open and viewport < md */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    aria-hidden="true"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar: drawer < md, icon-only rail md–lg, full lg+ */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 shadow-xl md:shadow-none transition-[transform,width] duration-300 ease-out w-64 md:w-16 lg:w-64 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                <SidebarContent navEntries={navEntries} pathname={pathname} onNavClick={closeSidebar} iconOnly={iconOnly} navBadges={getEffectiveNavBadges(pathname, navBadges)} isAdmin={isAdmin} />
            </aside>

            {/* Main content area */}
            <div className="flex flex-col flex-1 min-w-0 md:ml-16 lg:ml-64">
                {/* Mobile top bar: only when viewport < md (drawer mode) */}
                <header className="md:hidden sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 border-b border-surface-200 bg-white/95 dark:bg-surface-900/95 dark:border-surface-800 glass-panel backdrop-blur">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={openSidebar}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800"
                            aria-label="Open menu"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <Link href="/portal" className="min-w-0 flex-1">
                            <span className="block text-base font-bold tracking-tight truncate">Lacasandile Eatery</span>
                            <span className="block text-xs font-medium text-surface-500 dark:text-surface-400 truncate">powered by TextToEat</span>
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}