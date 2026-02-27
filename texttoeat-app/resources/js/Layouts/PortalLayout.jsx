import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import { Toaster, toast } from 'sonner';

const PORTAL_NAV_ITEMS = [
    { href: '/portal', label: 'Dashboard', icon: 'ph-house-simple' },
    { href: '/portal/orders', label: 'Orders', icon: 'ph-list-bullets' },
    { href: '/portal/orders/completed', label: 'Completed orders', icon: 'ph-check-circle' },
    { href: '/portal/quick-orders', label: 'Create order', icon: 'ph-lightning' },
    { href: '/portal/deliveries', label: 'Deliveries', icon: 'ph-truck' },
    { href: '/portal/pickup', label: 'Pickup counter', icon: 'ph-storefront' },
    { href: '/portal/walkin', label: 'Walk-in', icon: 'ph-utensils' },
    { href: '/portal/menu-items', label: "Today's menu", icon: 'ph-book-open' },
    { href: '/portal/logs/orders', label: 'Order logs', icon: 'ph-list-checks' },
    { href: '/portal/logs/chatbot', label: 'Chatbot logs', icon: 'ph-chat-circle-dots' },
];

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

function NavLink({ href, label, icon, pathname, onClick }) {
    const isActive = isPortalNavActive(href, pathname);
    const activeClass = isActive ? 'text-primary-600 font-bold dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10' : 'text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-800';
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeClass}`}
        >
            {icon && <i className={`ph-bold ${icon} text-lg shrink-0`} />}
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
            {isDark ? <i className="ph ph-sun text-xl"></i> : <i className="ph ph-moon text-xl"></i>}
        </button>
    );
}

function SidebarContent({ navItems, pathname, onNavClick }) {
    return (
        <>
            <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-200 dark:border-surface-800">
                <Link href="/portal" onClick={onNavClick} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shrink-0">
                        <i className="ph-bold ph-bowl-food relative z-10 text-2xl"></i>
                    </div>
                    <span className="text-lg font-bold leading-tight tracking-tight">Portal</span>
                </Link>
            </div>
            <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        pathname={pathname}
                        onClick={onNavClick}
                    />
                ))}
            </nav>
            <div className="p-4 border-t border-surface-200 dark:border-surface-800 space-y-2">
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

export default function PortalLayout({ children }) {
    const { auth, flash } = usePage().props;
    const pageUrl = usePage().url;
    const pathname = getPathname(pageUrl);
    const isAdmin = auth?.user?.role === 'admin';
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (flash?.error) toast.error(flash.error);
        if (flash?.success) toast.success(flash.success);
    }, [flash?.error, flash?.success]);

    const navItems = [...PORTAL_NAV_ITEMS];
    if (isAdmin) {
        navItems.push({ href: '/portal/users', label: 'Manage users', icon: 'ph-users-three' });
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
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={openSidebar}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800"
                            aria-label="Open menu"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            onClick={() => (window.history.length > 1 ? router.visit(window.history.back()) : router.visit('/portal'))}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800"
                            aria-label="Back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <Link href="/portal" className="flex items-center gap-2">
                            <span className="text-base font-bold tracking-tight">Portal</span>
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