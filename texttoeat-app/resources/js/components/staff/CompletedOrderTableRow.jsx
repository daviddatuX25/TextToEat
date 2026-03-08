import { router } from '@inertiajs/react';
import { Globe, MessageCircle, UserRound, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/formatNumber';

const CHANNEL_BADGES = {
    sms: { icon: MessageCircle, label: 'SMS', color: 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300' },
    messenger: { icon: MessageCircle, label: 'Messenger', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
    web: { icon: Globe, label: 'Web', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    walkin: { icon: UserRound, label: 'Walk-in', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
};

const routerOpts = () => ({
    preserveScroll: true,
    onSuccess: (p) => { p?.props?.flash?.error && toast.error(p.props.flash.error); },
    onError: (e) => { const m = e?.status ?? e?.message ?? (typeof e === 'string' ? e : null); m && toast.error(m); },
});

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { dateStyle: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export function CompletedOrderTableRow({ order }) {
    const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'completed';
    const channel = typeof order.channel === 'string' ? order.channel : order.channel?.value ?? 'web';
    const isPaid = (typeof order.payment_status === 'string' ? order.payment_status : order.payment_status?.value ?? 'unpaid') === 'paid';
    const isDelivery = (order.delivery_type ?? '') === 'delivery';
    const isWalkin = channel === 'walkin';
    const walkinType = order.walkin_type ?? order.walkinType ?? null;
    const walkinSubLabel = walkinType === 'dine_in' ? 'Dine in' : walkinType === 'takeout' ? 'Take out' : null;

    const badge = CHANNEL_BADGES[channel] ?? CHANNEL_BADGES.web;
    const Icon = badge.icon;

    const typeLabel = isDelivery
        ? (order.delivery_place === 'Other (paid on delivery)' ? 'Delivery (fee)' : `Delivery: ${order.delivery_place ?? '—'}`)
        : isWalkin
            ? (walkinSubLabel ? `Walk-in · ${walkinSubLabel}` : 'Walk-in')
            : 'Pickup';

    const togglePayment = (e) => {
        e.preventDefault();
        e.stopPropagation();
        router.put(`/portal/orders/${order.id}`, { payment_status: isPaid ? 'unpaid' : 'paid' }, routerOpts());
    };

    const statusLabel = status === 'cancelled' ? 'Cancelled' : 'Completed';

    return (
        <tr className="border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
            <td className="py-2.5 px-3 text-xs font-medium text-surface-600 dark:text-surface-400 tabular-nums whitespace-nowrap">
                #{order.reference ?? order.id}
                {order.order_marker && <span className="text-surface-400 dark:text-surface-500"> · {order.order_marker}</span>}
            </td>
            <td className="py-2.5 px-3 text-sm text-surface-800 dark:text-surface-200">
                <div className="font-medium truncate max-w-[140px]" title={order.customer_name ?? 'Walk-in'}>
                    {order.customer_name ?? 'Walk-in'}
                </div>
                {order.customer_phone && (
                    <div className="text-xs text-surface-500 truncate max-w-[140px]" title={order.customer_phone}>
                        {order.customer_phone}
                    </div>
                )}
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                <span className={`${badge.color} text-[10px] font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1`}>
                    <Icon className="h-3 w-3" />
                    {badge.label}
                </span>
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-600 dark:text-surface-400 max-w-[120px] truncate" title={typeLabel}>
                {typeLabel}
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                    {statusLabel}
                </span>
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Paid
                    </span>
                ) : (
                    <span className="text-xs text-surface-500">Unpaid</span>
                )}
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                <button
                    type="button"
                    onClick={togglePayment}
                    className="font-bold text-sm tabular-nums text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                    title={isPaid ? 'Mark unpaid' : 'Mark paid'}
                >
                    {formatCurrency(Number(order.total))}
                </button>
            </td>
            <td className="py-2.5 px-3 text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap">
                {formatDate(order.updated_at ?? order.created_at)}
            </td>
        </tr>
    );
}
