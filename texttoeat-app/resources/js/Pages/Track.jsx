import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';

export default function Track() {
    return (
        <AppLayout>
            <section className="flex flex-col gap-6 max-w-xl mx-auto text-center py-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                    Track your order
                </h1>
                <p className="text-lg text-surface-600 dark:text-surface-400">
                    Track your order by reference number. This feature is coming soon.
                </p>
                <Link
                    href="/menu"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-surface-200 dark:border-surface-700 px-5 py-2.5 text-sm font-bold text-surface-700 dark:text-surface-300 smooth-hover hover:bg-surface-100 dark:hover:bg-surface-800 w-fit mx-auto"
                >
                    <i className="ph ph-arrow-left"></i>
                    Back to menu
                </Link>
            </section>
        </AppLayout>
    );
}
