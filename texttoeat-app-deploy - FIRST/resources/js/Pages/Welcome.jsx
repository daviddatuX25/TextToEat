import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';

export default function Welcome() {
    return (
        <AppLayout>
            <section className="flex flex-col gap-8 text-center animate-fade-in">
                <header className="space-y-4 pb-8 border-b border-surface-200 dark:border-surface-800">
                    <img
                        src="/images/lacasandile-logo.png"
                        alt="Lacasandile Eatery"
                        className="mx-auto h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover shadow-lg"
                    />
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Order from <span className="text-primary-600 dark:text-primary-500">Lacasandile Eatery</span>
                    </h1>
                    <p className="max-w-xl mx-auto text-lg text-surface-600 dark:text-surface-400">
                        Order via SMS, Messenger, or web. Browse today’s menu and track your order.
                    </p>
                </header>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/menu"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
                    >
                        <i className="ph-fill ph-list text-xl"></i>
                        Browse today’s menu
                    </Link>
                    <Link
                        href="/track"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-surface-200 dark:border-surface-700 px-6 py-3.5 text-base font-bold text-surface-700 dark:text-surface-300 smooth-hover hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                        <i className="ph-fill ph-map-pin text-xl"></i>
                        Track your order
                    </Link>
                </div>
                <p className="text-sm text-surface-500 dark:text-surface-500">
                    Staff?{' '}
                    <Link
                        href="/login"
                        className="font-medium text-primary-600 dark:text-primary-500 hover:underline"
                    >
                        Log in to portal
                    </Link>
                </p>
                <div className="pt-6 border-t border-surface-200 dark:border-surface-800">
                    <p className="text-sm text-surface-500 dark:text-surface-500 mb-2">
                        Order via SMS, Messenger, or here on the web. One system, one kitchen.
                    </p>
                    <Link
                        href="/about"
                        className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:underline"
                    >
                        About this site →
                    </Link>
                </div>
            </section>
        </AppLayout>
    );
}
