import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Menu,
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
    Settings,
    Users,
    Smartphone,
    Bot,
    User,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { SiFacebook } from 'react-icons/si';
import { Toaster, toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/Collapsible';
import ThemeToggle from '../components/ThemeToggle';

const PORTAL_NAV_LINK_DASHBOARD = { type: 'link', href: '/portal', label: 'Dashboard', Icon: LayoutDashboard };
const PORTAL_NAV_GROUP_ORDERS = {
    type: 'group',
    label: 'Orders',
    Icon: ListOrdered,
    items: [
        { href: '/portal/orders', label: 'Orders', Icon: ListOrdered },
        { href: '/portal/orders/completed', label: 'Completed orders', Icon: CheckCircle },
        { href: '/portal/quick-orders', label: 'Create order', Icon: Zap },
        { href: '/portal/deliveries', label: 'Deliveries', Icon: Truck },
        { href: '/portal/pickup', label: 'Pickup counter', Icon: Store },
        { href: '/portal/walkin', label: 'Walk-in', Icon: UtensilsCrossed },
        { href: '/portal/logs/orders', label: 'Order logs', Icon: ClipboardList },
    ],
};
const PORTAL_NAV_LINK_MENU = { type: 'link', href: '/portal/menu-items', label: "Today's menu", Icon: BookOpen };
const PORTAL_NAV_GROUP_CONVERSATIONS = {
    type: 'group',
    label: 'Conversations',
    Icon: MessageCircle,
    items: [
        { href: '/portal/inbox', label: 'Conversation inbox', Icon: Inbox },
        { href: '/portal/logs/chatbot', label: 'Chatbot logs', Icon: MessageCircle },
    ],
};
const PORTAL_NAV_GROUP_CHANNELS_SETTINGS = {
    type: 'group',
    label: 'Channels & settings',
    Icon: Settings,
    items: [
        { href: '/portal/sms-devices', label: 'SMS devices', Icon: Smartphone },
        { href: '/portal/facebook-messenger', label: 'Facebook Messenger', Icon: SiFacebook },
        { href: '/portal/chatbot-replies', label: 'Reply templates', Icon: Settings },
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

function isPortalNavActive(href, pathname) {
    if (href === '/portal') return pathname === '/portal';
    if (href === '/portal/orders') return pathname === '/portal/orders';
    return pathname === href || pathname.startsWith(href + '/');
}

function isGroupActive(items, pathname) {
    return items.some((item) => isPortalNavActive(item.href, pathname));
}

function NavLink({ href, label, Icon, pathname, onClick }) {
    const isActive = isPortalNavActive(href, pathname);
    const activeClass = isActive
        ? 'text-surface-900 font-semibold dark:text-surface-100 bg-surface-200 dark:bg-surface-700'
        : 'text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-800';
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeClass}`}
            aria-current={isActive ? 'page' : undefined}
        >
            {Icon && (
                <span className="flex shrink-0 w-6 min-w-6 items-center justify-center text-[1.125rem]" aria-hidden>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                </span>
            )}
            {label}
        </Link>
    );
}

function NavGroup({ group, pathname, onNavClick }) {
    const { label, Icon, items } = group;
    const isActive = isGroupActive(items, pathname);
    const [userOpen, setUserOpen] = useState(() => isGroupActive(items, pathname));
    // When user navigates into this group, open it; otherwise respect their toggle
    useEffect(() => {
        if (isActive) setUserOpen(true);
    }, [isActive]);
    const open = userOpen;
    const activeTriggerClass = isActive
        ? 'text-surface-900 font-semibold dark:text-surface-100 bg-surface-200 dark:bg-surface-700'
        : 'text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-800';
    return (
        <Collapsible open={open} onOpenChange={setUserOpen} className="group/collapsible">
            <CollapsibleTrigger
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-[color,transform] duration-150 whitespace-nowrap active:scale-[0.98] ${activeTriggerClass}`}
                aria-expanded={open}
            >
                {Icon && (
                    <span className="flex shrink-0 w-6 min-w-6 items-center justify-center text-[1.125rem]" aria-hidden>
                        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                    </span>
                )}
                {label}
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
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function SidebarContent({ navEntries, pathname, onNavClick }) {
    return (
        <>
            <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-200 dark:border-surface-800">
                <Link href="/portal" onClick={onNavClick} className="flex items-center gap-3">
                    <img
                        src="/images/lacasandile-logo.png"
                        alt="Lacasandile Eatery"
                        className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                        <span className="block text-lg font-bold leading-tight tracking-tight">Lacasandile Eatery</span>
                        <span className="block text-xs font-medium text-surface-500 dark:text-surface-400">powered by TextToEat</span>
                    </div>
                </Link>
            </div>
            <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1">
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
                            />
                        );
                    }
                    return (
                        <NavGroup key={entry.label} group={entry} pathname={pathname} onNavClick={onNavClick} />
                    );
                })}
            </nav>
            <div className="p-4 border-t border-surface-200 dark:border-surface-800 space-y-2">
                <Link
                    href="/portal/account"
                    onClick={onNavClick}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-colors ${
                        pathname === '/portal/account'
                            ? 'border-surface-500 bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
                            : 'border-surface-200 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800'
                    }`}
                >
                    <User className="h-4 w-4" strokeWidth={2} />
                    Account
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle size={18} />
                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="flex-1 rounded-lg border-2 border-surface-200 px-3 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </>
    );
}

const DEBUG_LOG = (location, message, data, hypothesisId) => {
    fetch('http://127.0.0.1:7376/ingest/6bfbe7d4-b4cf-4142-be65-9dec6fac862c', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '91eb81' }, body: JSON.stringify({ sessionId: '91eb81', location, message, data: data || {}, timestamp: Date.now(), hypothesisId }) }).catch(() => {});
};

export default function PortalLayout({ children }) {
    const { auth, flash, show_daily_greeting } = usePage().props;
    const pageUrl = usePage().url;
    const pathname = getPathname(pageUrl);
    const isAdmin = auth?.user?.role === 'admin';
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // #region agent log
    useEffect(() => {
        DEBUG_LOG('PortalLayout.jsx:mount', 'PortalLayout mounted', { pathname }, 'H4');
        const onStart = (e) => { DEBUG_LOG('PortalLayout.jsx:inertia', 'Inertia start', { phase: 'start', url: e?.detail?.visit?.url ?? window.location.href }, 'H3'); };
        const onFinish = () => { DEBUG_LOG('PortalLayout.jsx:inertia', 'Inertia finish', { phase: 'finish' }, 'H3'); };
        const offStart = router.on('start', onStart);
        const offFinish = router.on('finish', onFinish);
        return () => { offStart(); offFinish(); };
    }, []);
    // #endregion

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (flash?.error) toast.error(flash.error);
        if (flash?.success) toast.success(flash.success);
    }, [flash?.error, flash?.success]);

    const navEntries = [
        PORTAL_NAV_LINK_DASHBOARD,
        PORTAL_NAV_GROUP_ORDERS,
        PORTAL_NAV_LINK_MENU,
        PORTAL_NAV_GROUP_CONVERSATIONS,
        ...(isAdmin ? [PORTAL_NAV_GROUP_CHANNELS_SETTINGS] : []),
    ];

    const closeSidebar = () => setSidebarOpen(false);
    const openSidebar = () => setSidebarOpen(true);

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

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    aria-hidden="true"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar: fixed on desktop (no scroll), drawer on mobile */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 shadow-xl lg:shadow-none transition-transform duration-300 ease-out ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <SidebarContent navEntries={navEntries} pathname={pathname} onNavClick={closeSidebar} />
            </aside>

            {/* Main content area */}
            <div className="flex flex-col flex-1 min-w-0 lg:ml-64">
                {/* Mobile top bar */}
                <header className="lg:hidden sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 border-b border-surface-200 bg-white/95 dark:bg-surface-900/95 dark:border-surface-800 glass-panel backdrop-blur">
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