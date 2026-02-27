import { Link, router, usePage } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { LayoutGrid, ArrowRight, Globe, MessageCircle, ShoppingBag, Truck, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';

const CHANNEL_BADGES = {
    sms: { icon: MessageCircle, label: 'SMS', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
    messenger: { icon: MessageCircle, label: 'Messenger', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
    web: { icon: Globe, label: 'Online', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    walkin: { icon: UserRound, label: 'Walk-in', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
};

function getPrevStatus(order) {
    const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
    const isDelivery = (order.delivery_type ?? '') === 'delivery';
    if (status === 'cancelled') return null;
    if (status === 'completed') return isDelivery ? 'on_the_way' : 'ready';
    if (status === 'on_the_way') return 'ready';
    if (status === 'ready') return 'confirmed';
    if (status === 'confirmed') return 'received';
    return null;
}

const routerOpts = () => ({
    preserveScroll: true,
    onSuccess: (p) => { p?.props?.flash?.error && toast.error(p.props.flash.error); },
    onError: (e) => { const m = e?.status ?? e?.message ?? (typeof e === 'string' ? e : null); m && toast.error(m); },
});

export function OrderListRow({ order, isHighlighted = false }) {
    const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
    const channel = typeof order.channel === 'string' ? order.channel : order.channel?.value ?? 'web';
    const isPaid = (typeof order.payment_status === 'string' ? order.payment_status : order.payment_status?.value ?? 'unpaid') === 'paid';
    const [cancelling, setCancelling] = useState(false);
    const cancelTimer = useRef(null);

    const updateStatus = (s) => {
        if (s === status) return;
        if (s === 'completed' && !isPaid) {
            toast.error('Mark the order as paid before completing.');
            return;
        }
        router.put(`/portal/orders/${order.id}`, { status: s }, routerOpts());
    };

    const togglePayment = () => {
        router.put(`/portal/orders/${order.id}`, { payment_status: isPaid ? 'unpaid' : 'paid' }, routerOpts());
    };

    const handleCancel = () => {
        if (cancelling) {
            clearTimeout(cancelTimer.current);
            setCancelling(false);
            cancelTimer.current = null;
            return;
        }
        setCancelling(true);
        cancelTimer.current = setTimeout(() => {
            router.put(`/portal/orders/${order.id}`, { status: 'cancelled' }, routerOpts());
            setCancelling(false);
            cancelTimer.current = null;
        }, 3000);
    };

    const isReceived = status === 'received';
    const isConfirmed = status === 'confirmed';
    const isReady = status === 'ready';
    const isOnTheWay = status === 'on_the_way';
    const isDelivery = (order.delivery_type ?? '') === 'delivery';
    const isWalkin = channel === 'walkin';
    const prevStatus = getPrevStatus(order);
    const walkinType = order.walkin_type ?? order.walkinType ?? null;

    const fulfillmentLabel = isDelivery
        ? (order.delivery_place === 'Other (paid on delivery)' ? 'Delivery: Other (fee on delivery)' : `Delivery: ${order.delivery_place ?? '—'} (free)`)
        : isWalkin
            ? (walkinType === 'dine_in' ? 'Dine in' : walkinType === 'takeout' ? 'Take out' : 'Walk-in')
            : 'Pickup';

    const badge = CHANNEL_BADGES[channel] ?? CHANNEL_BADGES.web;
    const Icon = badge.icon;

    const items = order.order_items ?? order.orderItems ?? [];

    return (
        <div className={`glass-panel p-4 rounded-2xl border border-surface-200 dark:border-surface-700 hover:shadow-glass group relative ${isHighlighted ? 'highlight-ring' : ''}`}>
            <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className={`${badge.color} text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5 uppercase shrink-0`} title={badge.label}>
                        <Icon className="h-3.5 w-3.5" />
                        {channel === 'web' ? 'Online' : badge.label}
                    </span>
                    {isPaid && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs font-bold px-2 py-1 rounded-md shrink-0">Paid</span>}
                    <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 ${isDelivery ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' : isWalkin ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300' : 'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-300'}`}>
                        {fulfillmentLabel}
                    </span>
                    <span className="text-surface-400 text-sm font-medium truncate">#{order.reference ?? order.id}</span>
                    {order.order_marker && <span className="text-surface-500 text-xs font-medium truncate">({order.order_marker})</span>}
                </div>
                {status !== 'completed' && status !== 'cancelled' && (
                    <span className="relative inline-flex shrink-0">
                        {cancelling && <span className="absolute inset-[-3px] rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-400 animate-spin pointer-events-none" style={{ animationDuration: '3s' }} aria-hidden />}
                        <button
                            type="button"
                            onClick={handleCancel}
                            title={cancelling ? 'Click again to cancel' : 'Cancel order'}
                            className={`relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${cancelling ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/20 text-amber-700' : 'border-surface-200 dark:border-surface-600 text-surface-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:border-red-500/30 dark:hover:text-red-400'}`}
                            aria-label={cancelling ? 'Click again to cancel' : 'Cancel order'}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </span>
                )}
            </div>

            <div className="space-y-2 mb-4">
                <h3 className="font-bold text-base text-surface-800 dark:text-surface-100 truncate flex items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" aria-hidden />
                    {order.customer_name ?? 'Walk-in'}
                </h3>
                {order.customer_phone && <span className="block text-sm text-surface-500 truncate">{order.customer_phone}</span>}
            </div>

            {(isReceived || isConfirmed || isReady || isOnTheWay) ? (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={togglePayment}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePayment(); } }}
                    aria-label={isPaid ? 'Mark unpaid (click to toggle)' : 'Mark paid (click to toggle)'}
                    className="p-3 bg-surface-100/50 dark:bg-surface-800/50 rounded-xl space-y-2 border border-surface-200/50 dark:border-surface-700/50 cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                    <div className="flex items-center justify-center">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {isPaid ? 'Mark unpaid' : 'Mark paid'}
                        </span>
                    </div>
                    {items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm gap-2">
                            <span className={`font-medium text-surface-700 dark:text-surface-300 min-w-0 truncate ${isPaid ? 'line-through' : ''}`}>
                                <span className="font-bold mr-2 text-primary-600 dark:text-primary-400">{item.quantity}x</span>
                                {item.name}
                            </span>
                            <span className={`font-bold shrink-0 ${isPaid ? 'line-through text-surface-500' : ''}`}>
                                ₱{Number((item.price ?? 0) * (item.quantity ?? 0)).toFixed(2)}
                            </span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between items-center">
                        <span className="text-xs text-surface-500 font-semibold uppercase">Total</span>
                        <span className={`font-bold text-lg text-primary-600 dark:text-primary-400 ${isPaid ? 'line-through' : ''}`}>₱{Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
            ) : (
                <div className="p-3 bg-surface-100/50 dark:bg-surface-800/50 rounded-xl space-y-2 border border-surface-200/50 dark:border-surface-700/50">
                    {items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm gap-2">
                            <span className={`font-medium text-surface-700 dark:text-surface-300 min-w-0 truncate ${isPaid ? 'line-through' : ''}`}>
                                <span className="font-bold mr-2 text-primary-600 dark:text-primary-400">{item.quantity}x</span>
                                {item.name}
                            </span>
                            <span className={`font-bold shrink-0 ${isPaid ? 'line-through text-surface-500' : ''}`}>
                                ₱{Number((item.price ?? 0) * (item.quantity ?? 0)).toFixed(2)}
                            </span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between items-center">
                        <span className="text-xs text-surface-500 font-semibold uppercase">Total</span>
                        <span className={`font-bold text-lg text-primary-600 dark:text-primary-400 ${isPaid ? 'line-through' : ''}`}>₱{Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
            )}

            {(isReceived || isConfirmed) && (
                <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-surface-200/50 dark:border-surface-700/50">
                    {prevStatus ? (
                        <button
                            type="button"
                            onClick={() => updateStatus(prevStatus)}
                            title={`Move back to ${prevStatus.replace('_', ' ')}`}
                            className="inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                            <ArrowRight className="h-6 w-6 rotate-180" />
                        </button>
                    ) : <span className="shrink-0" aria-hidden />}
                    {isReceived && (
                        <button
                            type="button"
                            onClick={() => updateStatus('confirmed')}
                            title="Confirm order"
                            className="inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-300 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 ml-auto"
                        >
                            <ArrowRight className="h-6 w-6" />
                        </button>
                    )}
                    {isConfirmed && (
                        <button
                            type="button"
                            onClick={() => updateStatus('ready')}
                            title="Mark as ready"
                            className="inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 ml-auto"
                        >
                            <ArrowRight className="h-6 w-6" />
                        </button>
                    )}
                </div>
            )}

            {(isReady || isOnTheWay) && (
                <div className="flex flex-col gap-3 mt-4">
                    <div className="flex items-center justify-between gap-2">
                        {prevStatus ? (
                            <button
                                type="button"
                                onClick={() => updateStatus(prevStatus)}
                                title={`Move back to ${prevStatus.replace('_', ' ')}`}
                                className="inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700"
                            >
                                <ArrowRight className="h-6 w-6 rotate-180" />
                            </button>
                        ) : <span className="w-14 shrink-0" aria-hidden />}
                        {isWalkin ? (
                            <Link href={`/portal/walkin?highlight=${order.id}`} title="Go to Walk-in counter" className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-violet-300 dark:border-violet-500/60 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20">
                                <ShoppingBag className="h-8 w-8" />
                            </Link>
                        ) : isDelivery ? (
                            <Link href={`/portal/deliveries?highlight=${order.id}`} title="Go to deliveries" className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-blue-300 dark:border-blue-500/60 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20">
                                <Truck className="h-8 w-8" />
                            </Link>
                        ) : (
                            <Link href={`/portal/pickup?highlight=${order.id}`} title="Go to pickup" className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-amber-300 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20">
                                <ShoppingBag className="h-8 w-8" />
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
