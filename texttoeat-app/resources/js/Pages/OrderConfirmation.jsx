import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';

export default function OrderConfirmation({ reference }) {
    return (
        <AppLayout>
            <section className="flex flex-col gap-4">
                <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                    Order placed
                </h1>
                <p className="text-lg text-muted-foreground">Thank you. Your order has been received.</p>
                <p>
                    <span className="font-bold">Order reference:</span>{' '}
                    <code className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-800">
                        {reference}
                    </code>
                </p>
                <Link
                    href="/track"
                    className="text-sm font-bold uppercase text-primary hover:underline"
                >
                    Track your order
                </Link>
            </section>
        </AppLayout>
    );
}
