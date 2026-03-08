import { router } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { LayoutGrid, ArrowRight, Globe, MessageCircle, ShoppingBag, Truck, UserRound, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/formatNumber';

const CHANNEL_BADGES = {
    sms: { icon: MessageCircle, label: 'SMS', color: 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300' },
    messenger: { icon: MessageCircle, label: 'Messenger', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
    web: { icon: Globe, label: 'Web', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    walkin: { icon: UserRound, label: 'Walk-in', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
};

function getPrevStatus(order) {
    const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
    const isDelivery = (order.delivery_type ?? '') === 'delivery';
    if (status === 'cancelled') return null;
    if (status === 'completed') return isDelivery ? 'on_the_way' : 'ready';
    if (status === 'on_the_way') return 'ready';
    if (status === 'ready') return 'preparing';
    if (status === 'preparing') return 'received';
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
    const isPreparing = status === 'preparing';
    const isReady = status === 'ready';
    const isOnTheWay = status === 'on_the_way';
    const isDelivery = (order.delivery_type ?? '') === 'delivery';
    const isWalkin = channel === 'walkin';
    const prevStatus = getPrevStatus(order);
    const walkinType = order.walkin_type ?? order.walkinType ?? null;

    const walkinSubLabel = walkinType === 'dine_in' ? 'Dine in' : walkinType === 'takeout' ? 'Take out' : null;

    const badge = CHANNEL_BADGES[channel] ?? CHANNEL_BADGES.web;
    const Icon = badge.icon;

    const items = order.order_items ?? order.orderItems ?? [];

    const hasDestination = isReady || isOnTheWay;
    const destinationHref = hasDestination
        ? (isWalkin
            ? `/portal/walkin?highlight=${order.id}`
            : isDelivery
                ? `/portal/deliveries?highlight=${order.id}`
                : `/portal/pickup?highlight=${order.id}`)
        : null;

    const handleCardClick = () => {
        if (destinationHref) {
            router.visit(destinationHref);
        }
    };

    const typeLabel = isDelivery
        ? (order.delivery_place === 'Other (paid on delivery)' ? 'Delivery (fee on delivery)' : `Delivery: ${order.delivery_place ?? '—'}`)
        : isWalkin
            ? (walkinSubLabel ? `Walk-in · ${walkinSubLabel}` : 'Walk-in')
            : 'Pickup';

    return (
        <div
            className={`rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 p-3 transition-shadow ${destinationHref ? 'cursor-pointer hover:shadow-md' : ''} ${isHighlighted ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
            onClick={handleCardClick}
            role={destinationHref ? 'button' : undefined}
            tabIndex={destinationHref ? 0 : undefined}
            onKeyDown={(e) => {
                if (!destinationHref) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                }
            }}
        >
            {/* Top row: reference + cancel */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-surface-500 dark:text-surface-400 tabular-nums">
                    #{order.reference ?? order.id}
                    {order.order_marker && <span className="text-surface-400 dark:text-surface-500"> · {order.order_marker}</span>}
                </span>
                {status !== 'completed' && status !== 'cancelled' && (
                    <span className="relative shrink-0">
                        {cancelling && (
                            <span className="absolute inset-[-2px] rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-400 animate-spin pointer-events-none" style={{ animationDuration: '3s' }} aria-hidden />
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                            title={cancelling ? 'Click again to cancel' : 'Cancel order'}
                            className={`relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border text-surface-500 transition-colors ${cancelling ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/20 text-amber-700' : 'border-surface-200 dark:border-surface-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400'}`}
                            aria-label={cancelling ? 'Click again to cancel' : 'Cancel order'}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </span>
                )}
            </div>

            {/* Customer */}
            <p className="font-semibold text-sm text-surface-800 dark:text-surface-100 truncate mb-0.5">
                {order.customer_name ?? 'Walk-in'}
            </p>
            {order.customer_phone && <p className="text-xs text-surface-500 truncate mb-2">{order.customer_phone}</p>}

            {/* Badges: channel, type, paid */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {channel !== 'walkin' && (
                    <span className={`${badge.color} text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase shrink-0`}>
                        <Icon className="h-3 w-3" />
                        {badge.label}
                    </span>
                )}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${isDelivery ? 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300' : isWalkin ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-300'}`}>
                    {typeLabel}
                </span>
                {isPaid && (
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        Paid
                    </span>
                )}
            </div>

            {/* Items + total (click to toggle pay when applicable) */}
            <div
                role={isReceived || isPreparing || isReady || isOnTheWay ? 'button' : undefined}
                tabIndex={isReceived || isPreparing || isReady || isOnTheWay ? 0 : undefined}
                onClick={(e) => { if (isReceived || isPreparing || isReady || isOnTheWay) { e.stopPropagation(); togglePayment(); } }}
                onKeyDown={(e) => {
                    if (!(isReceived || isPreparing || isReady || isOnTheWay)) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); togglePayment(); }
                }}
                aria-label={isReceived || isPreparing || isReady || isOnTheWay ? (isPaid ? 'Mark unpaid' : 'Mark paid') : undefined}
                className={`rounded-lg border border-surface-200/60 dark:border-surface-700/60 p-2 space-y-1 ${(isReceived || isPreparing || isReady || isOnTheWay) ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50' : ''}`}
            >
                {items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs gap-2">
                        <span className={`min-w-0 truncate ${isPaid ? 'line-through text-surface-500' : 'text-surface-700 dark:text-surface-300'}`}>
                            <span className="font-semibold text-primary-600 dark:text-primary-400 mr-1">{item.quantity}×</span>
                            {item.name}
                        </span>
                        <span className={`shrink-0 font-medium tabular-nums ${isPaid ? 'line-through text-surface-500' : ''}`}>
                            {formatCurrency(Number((item.price ?? 0) * (item.quantity ?? 0)))}
                        </span>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-surface-200/60 dark:border-surface-700/60">
                    <span className="text-[10px] font-medium text-surface-500 uppercase">Total</span>
                    <span className={`font-bold text-sm tabular-nums ${isPaid ? 'line-through text-surface-500' : 'text-primary-600 dark:text-primary-400'}`}>
                        {formatCurrency(Number(order.total))}
                    </span>
                </div>
                {(isReceived || isPreparing || isReady || isOnTheWay) && (
                    <p className="text-[10px] text-center text-surface-500 mt-0.5">Tap to {isPaid ? 'mark unpaid' : 'mark paid'}</p>
                )}
            </div>

            {/* Actions: advance or go */}
            {(isReceived || isPreparing) && (
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-surface-200/50 dark:border-surface-700/50">
                    {prevStatus ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateStatus(prevStatus); }}
                            title="Move back"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 dark:border-surface-600 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                        >
                            <ArrowRight className="h-4 w-4 rotate-180" />
                        </button>
                    ) : <span className="w-8 shrink-0" aria-hidden />}
                    {isReceived && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateStatus('preparing'); }}
                            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                        >
                            Start preparing
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {isPreparing && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateStatus('ready'); }}
                            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 text-xs font-semibold hover:bg-surface-100 dark:hover:bg-surface-700"
                        >
                            Mark ready
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )}

            {(isReady || isOnTheWay) && (
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-surface-200/50 dark:border-surface-700/50">
                    {prevStatus ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateStatus(prevStatus); }}
                            title="Move back"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 dark:border-surface-600 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                        >
                            <ArrowRight className="h-4 w-4 rotate-180" />
                        </button>
                    ) : <span className="w-8 shrink-0" aria-hidden />}
                    <div
                        className={`inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border-2 shrink-0 ${
                            isWalkin ? 'border-violet-300 dark:border-violet-500/60 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300' : isDelivery ? 'border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/60 text-surface-700 dark:text-surface-300' : 'border-amber-300 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        }`}
                    >
                        {isDelivery ? <Truck className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                        <span className="text-xs font-semibold">{isDelivery ? 'Delivery' : 'Pickup'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
