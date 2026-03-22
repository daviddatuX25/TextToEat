import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, router, usePage, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { PageHeader } from '../components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { usePortalOrdersLive } from '../hooks/usePortalOrdersLive';
import { getIncomingOrderToastMessage } from '../utils/orderIncomingToast';
import { filterOrdersBySearch } from '../utils/filterOrdersBySearch';
import { formatCurrency } from '../utils/formatNumber';
import { LayoutGrid, Trash2, List, Search } from 'lucide-react';

const routerOpts = () => ({
    preserveScroll: true,
    onSuccess: (p) => { p?.props?.flash?.error && toast.error(p.props.flash.error); },
    onError: (e) => { const m = e?.status ?? e?.message ?? (typeof e === 'string' ? e : null); m && toast.error(m); },
});

function PickupOrderCard({ order, pickupSlots, slotToOrder = {}, isHighlighted = false }) {
    const [slotOpen, setSlotOpen] = useState(false);
    const [slotValue, setSlotValue] = useState(order.pickup_slot ?? '');
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

    const assignSlot = (value) => {
        const v = value === '' || value === null ? null : value;
        router.patch(`/portal/orders/${order.id}/pickup-slot`, { pickup_slot: v }, { preserveScroll: true });
    };

    const isSlotTaken = (val) => {
        const o = slotToOrder[val];
        return o != null && o.id !== order.id;
    };

    const openSlotDialog = () => {
        setSlotValue(order.pickup_slot ?? '');
        setSlotOpen(true);
    };

    const saveSlot = () => {
        assignSlot(slotValue === '' ? null : slotValue);
        setSlotOpen(false);
    };

    const hasSlot = !!order.pickup_slot;

    return (
        <div
            className={`relative rounded-2xl border-2 p-4 transition-all ${
                isCompleted ? 'opacity-60 border-surface-200 dark:border-surface-700' : 'border-amber-200 dark:border-amber-500/30 bg-white dark:bg-surface-900 shadow-sm hover:shadow-md'
            } ${isHighlighted ? 'highlight-ring' : ''}`}
        >
            <button
                type="button"
                onClick={openSlotDialog}
                disabled={isCompleted}
                aria-label={hasSlot ? `Change pickup slot (currently ${order.pickup_slot})` : 'Assign pickup slot'}
                className={`absolute top-3 right-3 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                    hasSlot
                        ? 'bg-amber-100 dark:bg-amber-500/30 border-2 border-amber-400 dark:border-amber-500/60 text-amber-900 dark:text-amber-100 hover:ring-2 hover:ring-amber-400'
                        : 'border-2 border-dashed border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
            >
                {hasSlot ? order.pickup_slot : ''}
            </button>

            <div className="flex flex-wrap items-start justify-between gap-3 pr-16">
                <div className="min-w-0">
                    <span className="font-mono font-bold text-surface-800 dark:text-surface-100">#{order.reference ?? order.id}</span>
                    <span className="text-surface-500 text-sm ml-2">({order.customer_name ?? 'Walk-in'})</span>
                    <div className="text-xs text-surface-500 mt-1 flex items-center gap-2">
                        <span>{items.length ? `${items.length} item(s)` : ''}</span>
                        <span className="font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(Number(order.total))}</span>
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
                                {formatCurrency(Number((item.price ?? 0) * (item.quantity ?? 0)))}
                            </span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between items-center">
                        <span className="text-xs text-surface-500 font-semibold uppercase">Total</span>
                        <span className={`font-bold text-lg text-primary-600 dark:text-primary-400 ${isPaid ? 'line-through' : ''}`}>{formatCurrency(Number(order.total))}</span>
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
                        Complete
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

            <Dialog open={slotOpen} onOpenChange={setSlotOpen}>
                <DialogContent className="max-w-sm w-full sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{hasSlot ? 'Change pickup slot' : 'Assign pickup slot'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Slot</span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={() => setSlotValue('')}
                                className={`
                                    rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-colors
                                    ${slotValue === ''
                                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-500'
                                        : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500'
                                    }
                                `}
                            >
                                —
                            </button>
                            {pickupSlots.map((s) => {
                                const taken = isSlotTaken(s);
                                const selected = slotValue === s;
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => !taken && setSlotValue(s)}
                                        disabled={taken}
                                        className={`
                                            rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-colors
                                            ${taken
                                                ? 'border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 cursor-not-allowed'
                                                : selected
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-500'
                                                    : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500'
                                            }
                                        `}
                                        title={taken ? 'Taken' : undefined}
                                    >
                                        {s}{taken ? ' ✓' : ''}
                                    </button>
                                );
                            })}
                        </div>
                        <button type="button" onClick={saveSlot} className="w-full font-semibold py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.99]">
                            {hasSlot ? 'Update' : 'Assign'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ManageSlotsDialog({ pickupSlotsList = [], open, onOpenChange }) {
    const form = useForm({ value: '', sort_order: 0 });
    const addSlot = (e) => {
        e.preventDefault();
        form.post('/portal/pickup-slots', { onSuccess: () => form.reset() });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5" />
                        Pickup slots
                    </DialogTitle>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                        Counter slots for assigning pickup orders (e.g. A1, B2). Used when assigning an order to a slot.
                    </p>
                </DialogHeader>
                <div className="space-y-4">
                    {pickupSlotsList.length === 0 ? (
                        <p className="text-sm text-surface-500 dark:text-surface-400 rounded-lg border border-dashed border-surface-200 dark:border-surface-700 p-4 text-center">
                            No slots yet. Add one below.
                        </p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {pickupSlotsList.map((slot) => (
                                <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3">
                                    <span className="font-semibold text-surface-900 dark:text-white">{slot.value}</span>
                                    <button
                                        type="button"
                                        onClick={() => window.confirm(`Remove slot "${slot.value}"?`) && router.delete(`/portal/pickup-slots/${slot.id}`)}
                                        className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium"
                                        aria-label="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                        <form onSubmit={addSlot} className="space-y-4">
                            <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Add slot</h4>
                            <label className="block">
                                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Value</span>
                                <input
                                    type="text"
                                    required
                                    value={form.data.value}
                                    onChange={(e) => form.setData('value', e.target.value.trim())}
                                    className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                    placeholder="e.g. A1"
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
                                {form.processing ? 'Adding...' : 'Add slot'}
                            </button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const PICKUP_VIEW_MODE_KEY = 'pickupCounterViewMode';

export default function PickupCounter({ orders = [], pickupSlots = [], pickupSlotsList = [], highlight }) {
    const { errors } = usePage().props;
    usePortalOrdersLive({ getIncomingToastMessage: (p) => getIncomingOrderToastMessage('pickup', p) });
    const highlightRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [manageOpen, setManageOpen] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'card';
        return window.localStorage?.getItem(PICKUP_VIEW_MODE_KEY) || 'card';
    });
    const [activeHighlight, setActiveHighlight] = useState(() => (highlight ? String(highlight) : null));
    const highlightTimeoutRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && viewMode) {
            window.localStorage?.setItem(PICKUP_VIEW_MODE_KEY, viewMode);
        }
    }, [viewMode]);

    useEffect(() => {
        if (!highlight) {
            setActiveHighlight(null);
            return;
        }
        setActiveHighlight(String(highlight));
        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = setTimeout(() => {
            setActiveHighlight(null);
        }, 5000);
        return () => {
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, [highlight]);

    useEffect(() => {
        if (!activeHighlight) return;
        const handle = window.setTimeout(() => {
            if (!highlightRef.current) return;
            try {
                highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {
                // ignore
            }
        }, 50);
        return () => {
            window.clearTimeout(handle);
        };
    }, [activeHighlight]);

    const filteredOrders = useMemo(
        () => filterOrdersBySearch(orders, searchQuery, { extraFields: ['pickup_slot'] }),
        [orders, searchQuery]
    );

    const slotToOrder = {};
    filteredOrders.forEach((o) => {
        const s = o.pickup_slot ?? null;
        if (s) slotToOrder[s] = o;
    });

    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <PageHeader
                    title={
                        <>
                            Pickup <span className="bg-gradient-to-r from-primary-500 to-orange-400 bg-clip-text text-transparent [text-shadow:0_1px_2px_rgb(0_0_0_/_0.12)] dark:[text-shadow:0_1px_2px_rgb(0_0_0_/_0.35)]">counter</span>
                        </>
                    }
                    description="Assign pickup slots and manage orders for customer pickup."
                >
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" aria-hidden />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search orders…"
                                className="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                aria-label="Search pickup orders"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setManageOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Manage slots
                        </button>
                    </div>
                </PageHeader>

                {errors?.pickup_slot && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                        <i className="ph-fill ph-warning text-lg" aria-hidden />
                        {errors.pickup_slot}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <div
                        className="inline-flex rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-0.5"
                        role="group"
                        aria-label="View mode"
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode('card')}
                            aria-label="Card view"
                            aria-pressed={viewMode === 'card'}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                                viewMode === 'card'
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
                            }`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Card
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            aria-label="Table view"
                            aria-pressed={viewMode === 'table'}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
                            }`}
                        >
                            <List className="h-4 w-4" />
                            Table
                        </button>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                        <i className="ph-thin ph-storefront text-6xl text-surface-300 dark:text-surface-700 mb-4" aria-hidden />
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No pickup orders</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">
                            Pickup orders will appear here. Switch to card view to assign slots and manage orders.
                        </p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                        <Search className="h-12 w-12 text-surface-300 dark:text-surface-600 mb-4" />
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No orders match your search</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">Try a different search term or clear the search box.</p>
                        <button type="button" onClick={() => setSearchQuery('')} className="mt-4 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                            Clear search
                        </button>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 overflow-hidden">
                        <div className="overflow-x-auto max-h-[calc(100vh-18rem)] overflow-y-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Reference</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Customer</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Slot</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Paid</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Total</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => {
                                        const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
                                        const isPaid = (typeof order.payment_status === 'string' ? order.payment_status : order.payment_status?.value ?? 'unpaid') === 'paid';
                                        const isHighlight = activeHighlight != null && String(order.id) === String(activeHighlight);
                                        return (
                                            <tr
                                                key={order.id}
                                                className={`border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors ${isHighlight ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
                                            >
                                                <td className="py-2.5 px-3 font-mono text-xs font-medium text-surface-600 dark:text-surface-400 tabular-nums">
                                                    #{order.reference ?? order.id}
                                                </td>
                                                <td className="py-2.5 px-3 text-sm text-surface-800 dark:text-surface-200">
                                                    {order.customer_name ?? 'Walk-in'}
                                                </td>
                                                <td className="py-2.5 px-3 text-xs text-surface-600 dark:text-surface-400">
                                                    {order.pickup_slot ?? '—'}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-300 text-xs font-semibold capitalize">
                                                        {status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className={`text-xs font-semibold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                        {isPaid ? 'Paid' : 'Unpaid'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-bold text-sm tabular-nums text-primary-600 dark:text-primary-400">
                                                    {formatCurrency(Number(order.total))}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {status === 'ready' && (
                                                            <button
                                                                type="button"
                                                                disabled={!isPaid}
                                                                onClick={() => {
                                                                    if (!isPaid) {
                                                                        toast.error('Mark the order as paid before completing.');
                                                                        return;
                                                                    }
                                                                    router.put(`/portal/orders/${order.id}`, { status: 'completed' }, routerOpts());
                                                                }}
                                                                title={!isPaid ? 'Mark as paid first' : undefined}
                                                                className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg ${
                                                                    isPaid
                                                                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                                                                        : 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                Complete
                                                            </button>
                                                        )}
                                                        <Link
                                                            href={`/portal/orders?highlight=${order.id}`}
                                                            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                                                        >
                                                            Go to Orders
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400">
                            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col min-h-0 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/30 dark:bg-surface-800/30 overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-18rem)] p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredOrders.map((order) => {
                                    const isHighlight = activeHighlight != null && String(order.id) === String(activeHighlight);
                                    return (
                                        <div key={order.id} ref={isHighlight ? highlightRef : null} className={isHighlight ? 'ring-2 ring-primary-500 ring-offset-2 rounded-2xl' : ''}>
                                            <PickupOrderCard order={order} pickupSlots={pickupSlots} slotToOrder={slotToOrder} isHighlighted={isHighlight} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="shrink-0 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 text-xs text-surface-500 dark:text-surface-400">
                            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                )}
            </section>

            <ManageSlotsDialog pickupSlotsList={pickupSlotsList} open={manageOpen} onOpenChange={setManageOpen} />
        </PortalLayout>
    );
}
