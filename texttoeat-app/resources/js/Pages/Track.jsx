import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import { Button, Input } from '../components/ui';

const STATUS_BADGE_CLASSES = {
    received: 'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-300',
    confirmed: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
    ready: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    on_the_way: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

function getStatusLabel(status) {
    const labels = {
        received: 'Received',
        confirmed: 'Confirmed',
        ready: 'Ready',
        on_the_way: 'On the way',
        completed: 'Completed',
        cancelled: 'Cancelled',
    };
    return labels[status] ?? status;
}

function getDeliveryTypeLabel(deliveryType) {
    if (deliveryType === 'delivery') return 'Delivery';
    if (deliveryType === 'walkin') return 'Walk-in';
    return 'Pickup';
}

export default function Track({ order = null, searched_reference: searchedReference = null }) {
    return (
        <AppLayout>
            <section className="flex flex-col gap-8 max-w-xl mx-auto py-8 animate-fade-in">
                <header className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Track your order
                    </h1>
                    <p className="text-lg text-surface-600 dark:text-surface-400">
                        Enter your order reference to see its status.
                    </p>
                </header>

                <form method="get" action="/track" className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                    <div className="flex-1 min-w-0">
                        <Input
                            id="reference"
                            name="reference"
                            label="Order reference"
                            placeholder="e.g. ABC12345"
                            defaultValue={searchedReference ?? ''}
                            className="border-surface-200 dark:border-surface-700 dark:bg-surface-800"
                        />
                    </div>
                    <Button type="submit" className="shrink-0">
                        Look up
                    </Button>
                </form>

                {order && (
                    <div className="rounded-xl border border-surface-200 bg-white p-6 text-left dark:border-surface-800 dark:bg-surface-800/50 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-surface-500 dark:text-surface-400">
                                Reference
                            </span>
                            <code className="rounded-lg border border-surface-200 bg-surface-100 px-2.5 py-1 font-mono text-sm font-bold text-surface-800 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200">
                                {order.reference}
                            </code>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                    STATUS_BADGE_CLASSES[order.status] ?? STATUS_BADGE_CLASSES.received
                                }`}
                            >
                                {getStatusLabel(order.status)}
                            </span>
                            <span className="text-xs text-surface-500 dark:text-surface-400">
                                {getDeliveryTypeLabel(order.delivery_type)}
                            </span>
                        </div>
                        <p className="text-surface-600 dark:text-surface-400">
                            {order.status_copy}
                        </p>
                    </div>
                )}

                {order === null && searchedReference && (
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-6 text-center dark:border-surface-800 dark:bg-surface-800/30">
                        <p className="text-surface-600 dark:text-surface-400">
                            No order found for this reference.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                    <Link
                        href="/menu"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-surface-200 dark:border-surface-700 px-5 py-2.5 text-sm font-bold text-surface-700 dark:text-surface-300 smooth-hover hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                        <i className="ph ph-arrow-left"></i>
                        Back to menu
                    </Link>
                    <Link
                        href="/"
                        className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:underline"
                    >
                        Home
                    </Link>
                </div>
            </section>
        </AppLayout>
    );
}
