import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import { Globe, MessageCircle } from 'lucide-react';

export default function WebOrderingUnavailable() {
    return (
        <AppLayout>
            <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-6">
                    <Globe className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
                    Web ordering is temporarily unavailable
                </h1>
                <p className="text-surface-600 dark:text-surface-400 mb-8">
                    Please try again later or order via SMS or Facebook Messenger.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
                >
                    <MessageCircle className="h-4 w-4" />
                    Back to home
                </Link>
            </div>
        </AppLayout>
    );
}
