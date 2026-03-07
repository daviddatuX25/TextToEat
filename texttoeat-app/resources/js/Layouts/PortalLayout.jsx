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
    Users,
    Sun,
    Moon,
    Smartphone,
    Bot,
    User,
} from 'lucide-react';
import { SiFacebook } from 'react-icons/si';
import { Toaster, toast } from 'sonner';

const PORTAL_NAV_ITEMS_BASE = [
    { href: '/portal', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/portal/orders', label: 'Orders', Icon: ListOrdered },
    { href: '/portal/orders/completed', label: 'Completed orders', Icon: CheckCircle },
    { href: '/portal/quick-orders', label: 'Create order', Icon: Zap },
    { href: '/portal/deliveries', label: 'Deliveries', Icon: Truck },
    { href: '/portal/pickup', label: 'Pickup counter', Icon: Store },
    { href: '/portal/walkin', label: 'Walk-in', Icon: UtensilsCrossed },
    { href: '/portal/menu-items', label: "Today's menu", Icon: BookOpen },
    { href: '/portal/logs/orders', label: 'Order logs', Icon: ClipboardList },
    { href: '/portal/inbox', label: 'Conversation inbox', Icon: Inbox },
    { href: '/portal/logs/chatbot', label: 'Chatbot logs', Icon: MessageCircle },
];
const PORTAL_NAV_ITEM_SMS_DEVICES = { href: '/portal/sms-devices', label: 'SMS devices', Icon: Smartphone };
const PORTAL_NAV_ITEM_FACEBOOK_MESSENGER = { href: '/portal/facebook-messenger', label: 'Facebook Messenger', Icon: SiFacebook };

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

function NavLink({ href, label, Icon, pathname, onClick }) {
    const isActive = isPortalNavActive(href, pathname);
    const activeClass = isActive
        ? 'text-primary-700 font-semibold dark:text-primary-300 bg-primary-100 dark:bg-primary-500/20'
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

function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (document.documentElement.classList.contains('dark')) {
            setIsDark(true);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return next;
        });
    };

    return (
        <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full text-surface-500 smooth-hover hover:bg-surface-200 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-50"
            aria-label="Toggle theme"
        >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
    );
}

function SidebarContent({ navItems, pathname, onNavClick }) {
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
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        Icon={item.Icon}
                        pathname={pathname}
                        onClick={onNavClick}
                    />
                ))}
            </nav>
            <div className="p-4 border-t border-surface-200 dark:border-surface-800 space-y-2">
                <Link
                    href="/portal/account"
                    onClick={onNavClick}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-colors ${
                        pathname === '/portal/account'
                            ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                            : 'border-surface-200 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800'
                    }`}
                >
                    <User className="h-4 w-4" strokeWidth={2} />
                    Account
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
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
    const { auth, flash } = usePage().props;
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

    const navItems = [...PORTAL_NAV_ITEMS_BASE];
    if (isAdmin) {
        navItems.push(PORTAL_NAV_ITEM_SMS_DEVICES);
        navItems.push(PORTAL_NAV_ITEM_FACEBOOK_MESSENGER);
        navItems.push({ href: '/portal/simulate', label: 'Channel simulator', Icon: Bot });
        navItems.push({ href: '/portal/users', label: 'Manage users', Icon: Users });
    }

    const closeSidebar = () => setSidebarOpen(false);
    const openSidebar = () => setSidebarOpen(true);

    return (
        <div className="flex min-h-screen w-full bg-surface-50 text-surface-900 transition-colors duration-500 selection:bg-primary-500 selection:text-white dark:bg-surface-900 dark:text-surface-50 antialiased overflow-x-hidden">
            <Toaster richColors position="top-right" />

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    aria-hidden="true"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar: fixed on desktop, drawer on mobile */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 shadow-xl lg:shadow-none transition-transform duration-300 ease-out ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <SidebarContent navItems={navItems} pathname={pathname} onNavClick={closeSidebar} />
            </aside>

            {/* Main content area */}
            <div className="flex flex-col flex-1 min-w-0">
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