import { Link, usePage } from '@inertiajs/react';
import { ShieldX } from 'lucide-react';
import PortalLayout from '../Layouts/PortalLayout';
import { Button } from '../components/ui/Button';

export default function Forbidden({ message = 'You don\'t have permission to view this page.' }) {
    const { auth } = usePage().props;
    const isAuthenticated = auth?.user != null;

    const content = (
        <section className="flex flex-col items-center justify-center gap-6 py-12 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <ShieldX className="h-8 w-8" strokeWidth={2} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-surface-900 dark:text-white">Access denied</h1>
                <p className="mt-2 text-sm text-surface-600 dark:text-surface-400 max-w-md">
                    {message}
                </p>
            </div>
            <Link href={isAuthenticated ? '/portal' : '/login'}>
                <Button variant="default">
                    {isAuthenticated ? 'Back to dashboard' : 'Go to login'}
                </Button>
            </Link>
        </section>
    );

    if (isAuthenticated) {
        return <PortalLayout>{content}</PortalLayout>;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-6 dark:bg-surface-900">
            {content}
        </div>
    );
}
