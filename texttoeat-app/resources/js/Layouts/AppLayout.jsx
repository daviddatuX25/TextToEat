import { Link, router, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function getPathname(url) {
    try {
        return new URL(url, 'http://localhost').pathname;
    } catch {
        return url;
    }
}

function NavLink({ href, children, pathname, onClick }) {
    const isExact = href === '/';
    const isActive = isExact ? pathname === '/' : (pathname === href || (href === '/dashboard' && pathname === '/dashboard'));
    const activeClass = isActive ? 'text-primary-600 font-bold dark:text-primary-400' : 'text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400';
    return (
        <Link href={href} onClick={onClick} className={`text-sm font-semibold transition-colors ${activeClass}`}>
            {children}
        </Link>
    );
}

function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check initial theme from document class or localStorage
        if (document.documentElement.classList.contains('dark')) {
            setIsDark(true);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        if (!isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full text-surface-500 smooth-hover hover:bg-surface-200 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-50"
            aria-label="Toggle theme"
        >
            {isDark ? (
                <i className="ph ph-sun text-xl"></i>
            ) : (
                <i className="ph ph-moon text-xl"></i>
            )}
        </button>
    );
}

export default function AppLayout({ children, showDashboard = true }) {
    const { auth } = usePage().props;
    const pageUrl = usePage().url;
    const pathname = getPathname(pageUrl);
    const isStaff = auth?.user != null;
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-surface-50 text-surface-900 transition-colors duration-500 selection:bg-primary-500 selection:text-white dark:bg-surface-900 dark:text-surface-50 antialiased overflow-x-hidden">
            {/* Global Navigation (Glassmorphism) */}
            <nav className="fixed inset-x-0 top-0 z-50 border-b border-surface-200 glass-panel dark:border-surface-800">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="group relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-float">
                            <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 ease-out group-hover:translate-y-0"></div>
                            <i className="ph-bold ph-bowl-food relative z-10 text-2xl"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold leading-tight tracking-tight">TextToEat</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                                Lacasandile Eatery
                            </span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <NavLink href="/" pathname={pathname}>Home</NavLink>
                        <NavLink href="/menu" pathname={pathname}>Menu</NavLink>
                        <NavLink href="/track" pathname={pathname}>Track</NavLink>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-50"
                            aria-label="Open menu"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <ThemeToggle />
                        <div className="h-8 w-px bg-surface-200 dark:bg-surface-700 hidden md:block"></div>
                        
                        {isStaff ? (
                            <div className="hidden md:flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => router.post('/logout')}
                                    className="rounded-lg border-2 border-surface-200 px-3 py-1.5 text-xs font-bold text-surface-600 smooth-hover hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
                                >
                                    Log out
                                </button>
                                <div className="group flex cursor-pointer items-center gap-2">
                                    <img
                                        src="https://ui-avatars.com/api/?name=Admin+Staff&background=ea580c&color=fff&rounded=true&bold=true"
                                        alt="Staff Profile"
                                        className="h-9 w-9 rounded-full ring-2 ring-transparent transition-all group-hover:ring-primary-500"
                                    />
                                    <i className="ph-bold ph-caret-down text-sm text-surface-400 transition-colors group-hover:text-primary-500"></i>
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="hidden md:flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-bold tracking-[0.015em] text-white transition-opacity hover:opacity-90"
                            >
                                Staff Login
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile menu overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    aria-hidden="true"
                    onClick={() => setMobileOpen(false)}
                />
            )}
            {/* Mobile menu panel */}
            <div
                className={`fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] flex flex-col bg-surface-50 dark:bg-surface-900 border-l border-surface-200 dark:border-surface-800 shadow-xl transition-transform duration-300 ease-out md:hidden ${
                    mobileOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex h-16 items-center justify-end px-6 border-b border-surface-200 dark:border-surface-800">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800"
                        aria-label="Close menu"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex flex-col gap-6 p-6">
                    <NavLink href="/" pathname={pathname} onClick={() => setMobileOpen(false)}>Home</NavLink>
                    <NavLink href="/menu" pathname={pathname} onClick={() => setMobileOpen(false)}>Menu</NavLink>
                    <NavLink href="/track" pathname={pathname} onClick={() => setMobileOpen(false)}>Track</NavLink>
                    <div className="h-px bg-surface-200 dark:bg-surface-800" />
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <span className="text-sm text-surface-500">Theme</span>
                    </div>
                    {isStaff ? (
                        <button
                            type="button"
                            onClick={() => { setMobileOpen(false); router.post('/logout'); }}
                            className="rounded-lg border-2 border-surface-200 px-3 py-2 text-sm font-bold text-surface-600 smooth-hover hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 text-left"
                        >
                            Log out
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            onClick={() => setMobileOpen(false)}
                            className="flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
                        >
                            Staff Login
                        </Link>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="mx-auto w-full max-w-7xl px-6 pt-28 pb-20">
                {children}
            </main>
        </div>
    );
}
