import { Link } from '@inertiajs/react';
import {
    Inbox,
    ChefHat,
    CheckCircle,
    Truck,
    CircleCheck,
    XCircle,
    UtensilsCrossed,
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';
import { Button, Input } from '../components/ui';
import { formatCurrency } from '../utils/formatNumber';

const STATUS_BADGE_CLASSES = {
    received: 'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-300',
    confirmed: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300', // legacy
    preparing: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
    ready: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    on_the_way: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

const STATUS_ICONS = {
    received: Inbox,
    confirmed: ChefHat, // legacy
    preparing: ChefHat,
    ready: CheckCircle,
    on_the_way: Truck,
    completed: CircleCheck,
    cancelled: XCircle,
};

function getStatusLabel(status) {
    const labels = {
        received: 'Received',
        confirmed: 'Preparing', // legacy: backfill may not have run yet
        preparing: 'Preparing',
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

function formatTimelineAt(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
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
                    <div className="rounded-xl border border-surface-200 bg-white p-6 text-left dark:border-surface-800 dark:bg-surface-800/50 space-y-5">
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
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                    STATUS_BADGE_CLASSES[order.status] ?? STATUS_BADGE_CLASSES.received
                                }`}
                            >
                                {(() => {
                                    const StatusIcon = STATUS_ICONS[order.status] ?? Inbox;
                                    return <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />;
                                })()}
                                {getStatusLabel(order.status)}
                            </span>
                            <span className="text-xs text-surface-500 dark:text-surface-400">
                                {getDeliveryTypeLabel(order.delivery_type)}
                            </span>
                        </div>
                        <p className="text-surface-600 dark:text-surface-400">
                            {order.status_copy}
                        </p>

                        {order.order_items && order.order_items.length > 0 && (
                            <div className="space-y-2">
                                <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                                    Your order
                                </h2>
                                <ul className="space-y-2">
                                    {order.order_items.map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center gap-3 rounded-lg border border-surface-200/60 dark:border-surface-700/60 p-2.5"
                                        >
                                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <UtensilsCrossed className="h-6 w-6 text-surface-500 dark:text-surface-400" aria-hidden />
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-surface-800 dark:text-surface-200 truncate">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-surface-500 dark:text-surface-400">
                                                    {item.quantity} × {formatCurrency(Number(item.price))}
                                                </p>
                                            </div>
                                            <span className="shrink-0 font-semibold tabular-nums text-surface-800 dark:text-surface-200">
                                                {formatCurrency(Number(item.price) * (item.quantity ?? 0))}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {order.status_timeline && order.status_timeline.length > 0 && (
                            <div className="space-y-2">
                                <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                                    Status timeline
                                </h2>
                                <div className="relative pl-5 border-l-2 border-surface-200 dark:border-surface-700 space-y-0">
                                    {order.status_timeline.map((step, i) => {
                                        const isCurrent = step.status === order.status;
                                        const StatusStepIcon = STATUS_ICONS[step.status] ?? Inbox;
                                        const badgeClass =
                                            STATUS_BADGE_CLASSES[step.status] ?? STATUS_BADGE_CLASSES.received;
                                        return (
                                            <div
                                                key={`${step.status}-${step.at}-${i}`}
                                                className="relative -left-5 flex items-start gap-3 pb-4 last:pb-0"
                                            >
                                                <span
                                                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                                                        isCurrent
                                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300'
                                                            : 'border-surface-200 bg-white dark:border-surface-600 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
                                                    }`}
                                                >
                                                    <StatusStepIcon className="h-3.5 w-3.5" aria-hidden />
                                                </span>
                                                <div className="min-w-0 flex-1 pt-0.5">
                                                    <p
                                                        className={
                                                            isCurrent
                                                                ? 'font-semibold text-surface-800 dark:text-surface-200'
                                                                : 'text-sm text-surface-600 dark:text-surface-400'
                                                        }
                                                    >
                                                        {getStatusLabel(step.status)}
                                                    </p>
                                                    <p className="text-xs text-surface-500 dark:text-surface-400">
                                                        {formatTimelineAt(step.at)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
