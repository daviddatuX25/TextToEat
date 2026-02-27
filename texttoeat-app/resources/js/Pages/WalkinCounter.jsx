import { useState, useEffect, useRef } from 'react';
import { Link, router, usePage, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { UtensilsCrossed, Trash2 } from 'lucide-react';

const routerOpts = () => ({
    preserveScroll: true,
    onSuccess: (p) => { p?.props?.flash?.error && toast.error(p.props.flash.error); },
    onError: (e) => { const m = e?.status ?? e?.message ?? (typeof e === 'string' ? e : null); m && toast.error(m); },
});

function WalkinOrderCard({ order, orderMarkers, markerToOrder = {}, isHighlighted = false }) {
    const [markerOpen, setMarkerOpen] = useState(false);
    const [markerValue, setMarkerValue] = useState(order.order_marker ?? '');
    const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
    const isCompleted = status === 'completed';
    const isPaid = (typeof order.payment_status === 'string' ? order.payment_status : order.payment_status?.value ?? 'unpaid') === 'paid';
    const items = order.order_items ?? order.orderItems ?? [];

    const togglePayment = () => {
        router.put(`/portal/orders/${order.id}`, { payment_status: isPaid ? 'unpaid' : 'paid' }, routerOpts());
    };

    const updateStatus = (s) => {
        router.put(`/portal/orders/${order.id}`, { status: s }, routerOpts());
    };

    const assignMarker = (value) => {
        const v = value === '' || value === null ? null : value;
        router.patch(`/portal/orders/${order.id}/order-marker`, { order_marker: v }, { preserveScroll: true });
    };

    const isMarkerTaken = (val) => {
        const o = markerToOrder[val];
        return o != null && o.id !== order.id;
    };

    const openMarkerDialog = () => {
        setMarkerValue(order.order_marker ?? '');
        setMarkerOpen(true);
    };

    const saveMarker = () => {
        assignMarker(markerValue === '' ? null : markerValue);
        setMarkerOpen(false);
    };

    const hasMarker = order.order_marker != null && order.order_marker !== '';
    const walkinTypeLabel = order.walkin_type === 'dine_in' ? 'Dine in' : order.walkin_type === 'takeout' ? 'Take out' : 'Walk-in';

    return (
        <div
            className={`relative rounded-2xl border-2 p-4 transition-all ${
                isCompleted ? 'opacity-60 border-surface-200 dark:border-surface-700' : 'border-violet-200 dark:border-violet-500/30 bg-white dark:bg-surface-900 shadow-sm hover:shadow-md'
            } ${isHighlighted ? 'highlight-ring' : ''}`}
        >
            <button
                type="button"
                onClick={openMarkerDialog}
                disabled={isCompleted}
                aria-label={hasMarker ? `Change dining marker (currently ${order.order_marker})` : 'Assign dining marker'}
                className={`absolute top-3 right-3 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                    hasMarker
                        ? 'bg-violet-100 dark:bg-violet-500/30 border-2 border-violet-400 dark:border-violet-500/60 text-violet-900 dark:text-violet-100 hover:ring-2 hover:ring-violet-400'
                        : 'border-2 border-dashed border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
            >
                {hasMarker ? order.order_marker : ''}
            </button>

            <div className="flex flex-wrap items-start justify-between gap-3 pr-16">
                <div className="min-w-0">
                    <span className="font-mono font-bold text-surface-800 dark:text-surface-100">#{order.reference ?? order.id}</span>
                    <span className="text-surface-500 text-sm ml-2">({order.customer_name ?? 'Walk-in'})</span>
                    <div className="text-xs text-surface-500 mt-1 flex items-center gap-2">
                        <span>{walkinTypeLabel}</span>
                        <span>{items.length ? `${items.length} item(s)` : ''}</span>
                        <span className="font-semibold text-primary-600 dark:text-primary-400">₱{Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-300 capitalize">
                        {status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {!isCompleted && (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={togglePayment}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePayment(); } }}
                    aria-label={isPaid ? 'Mark unpaid (click to toggle)' : 'Mark paid (click to toggle)'}
                    className="mt-3 p-3 bg-surface-100/50 dark:bg-surface-800/50 rounded-xl space-y-2 border border-surface-200/50 dark:border-surface-700/50 cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
            )}

            <div className="mt-3 flex flex-col gap-2">
                {status === 'ready' && (
                    <button
                        type="button"
                        onClick={() => {
                            if (!isPaid) { toast.error('Mark the order as paid before completing.'); return; }
                            updateStatus('completed');
                        }}
                        title={!isPaid ? 'Mark as paid first' : undefined}
                        className={`w-full font-semibold py-2 rounded-xl active:scale-[0.99] ${
                            isPaid ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400 hover:opacity-90'
                        }`}
                    >
                        Mark completed
                    </button>
                )}
                <Link
                    href={`/portal/orders?highlight=${order.id}`}
                    className="w-full font-semibold py-2 rounded-xl border-2 border-primary-400 dark:border-primary-500/60 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-500/20 active:scale-[0.99] text-center"
                    title="Change status or move back on the Orders page"
                >
                    Go to Orders
                </Link>
            </div>

            <Dialog open={markerOpen} onOpenChange={setMarkerOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{hasMarker ? 'Change dining marker' : 'Assign dining marker'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Marker</span>
                            <select
                                value={markerValue}
                                onChange={(e) => setMarkerValue(e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm font-medium text-surface-800 dark:text-surface-200"
                            >
                                <option value="">—</option>
                                {orderMarkers.map((m) => (
                                    <option key={m} value={m} disabled={isMarkerTaken(m)}>
                                        {m}{isMarkerTaken(m) ? ' (taken)' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button type="button" onClick={saveMarker} className="w-full font-semibold py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.99]">
                            {hasMarker ? 'Update' : 'Assign'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ManageMarkersDialog({ diningMarkersList = [], open, onOpenChange }) {
    const form = useForm({ value: '', sort_order: 0 });
    const addMarker = (e) => {
        e.preventDefault();
        form.post('/portal/dining-markers', { onSuccess: () => form.reset() });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UtensilsCrossed className="h-5 w-5" />
                        Dining markers
                    </DialogTitle>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                        Table or order markers for walk-in orders (e.g. 1, 2, Table A). Used when assigning an order to a table or marker.
                    </p>
                </DialogHeader>
                <div className="space-y-4">
                    {diningMarkersList.length === 0 ? (
                        <p className="text-sm text-surface-500 dark:text-surface-400 rounded-lg border border-dashed border-surface-200 dark:border-surface-700 p-4 text-center">
                            No markers yet. Add one below.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {diningMarkersList.map((marker) => (
                                <li key={marker.id} className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3">
                                    <span className="font-semibold text-surface-900 dark:text-white">{marker.value}</span>
                                    <button
                                        type="button"
                                        onClick={() => window.confirm(`Remove marker "${marker.value}"?`) && router.delete(`/portal/dining-markers/${marker.id}`)}
                                        className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium"
                                        aria-label="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                        <form onSubmit={addMarker} className="space-y-4">
                            <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Add marker</h4>
                            <label className="block">
                                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Value</span>
                                <input
                                    type="text"
                                    required
                                    value={form.data.value}
                                    onChange={(e) => form.setData('value', e.target.value.trim())}
                                    className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                    placeholder="e.g. 1 or Table A"
                                />
                            </label>
                            {Object.keys(form.errors).length > 0 && (
                                <ul className="text-sm text-red-600 dark:text-red-400">
                                    {Object.entries(form.errors).map(([k, v]) => (
                                        <li key={k}>{v}</li>
                                    ))}
                                </ul>
                            )}
                            <button type="submit" disabled={form.processing} className="py-2 px-4 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50">
                                {form.processing ? 'Adding...' : 'Add marker'}
                            </button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function WalkinCounter({ orders = [], orderMarkers = [], diningMarkersList = [], highlight }) {
    const { errors } = usePage().props;
    const highlightRef = useRef(null);
    const [manageOpen, setManageOpen] = useState(false);

    useEffect(() => {
        if (highlight && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlight]);

    const markerToOrder = {};
    orders.forEach((o) => {
        const m = o.order_marker ?? null;
        if (m) markerToOrder[m] = o;
    });

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                        <UtensilsCrossed className="h-4 w-4" />
                        Dine-in / Take out
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Walk-in <span className="bg-gradient-to-r from-primary-500 to-violet-400 bg-clip-text text-transparent">counter</span>
                        </h1>
                        <button
                            type="button"
                            onClick={() => setManageOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                        >
                            <UtensilsCrossed className="h-4 w-4" />
                            Manage dining markers
                        </button>
                    </div>
                </header>

                {errors?.order_marker && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                        <i className="ph-fill ph-warning text-lg"></i>
                        {errors.order_marker}
                    </div>
                )}

                <div>
                    <h2 className="text-xl font-bold text-surface-800 dark:text-surface-100 mb-4">Walk-in orders</h2>
                    {orders.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500">
                            No walk-in orders.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {orders.map((order) => {
                                const isHighlight = String(order.id) === String(highlight);
                                return (
                                    <div key={order.id} ref={isHighlight ? highlightRef : null} className={isHighlight ? 'p-2 -m-2' : ''}>
                                        <WalkinOrderCard order={order} orderMarkers={orderMarkers} markerToOrder={markerToOrder} isHighlighted={isHighlight} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <ManageMarkersDialog diningMarkersList={diningMarkersList} open={manageOpen} onOpenChange={setManageOpen} />
        </PortalLayout>
    );
}
