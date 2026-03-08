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
import { MapPin, Trash2, LayoutGrid, List, Search } from 'lucide-react';

const routerOpts = () => ({
    preserveScroll: true,
    onSuccess: (p) => { p?.props?.flash?.error && toast.error(p.props.flash.error); },
    onError: (e) => { const m = e?.status ?? e?.message ?? (typeof e === 'string' ? e : null); m && toast.error(m); },
});

function DeliveryOrderCard({ order, isHighlighted = false }) {
    const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
    const isCompleted = status === 'completed';
    const isPaid = (typeof order.payment_status === 'string' ? order.payment_status : order.payment_status?.value ?? 'unpaid') === 'paid';
    const items = order.order_items ?? order.orderItems ?? [];
    const deliveryPlace = order.delivery_place === 'Other (paid on delivery)' ? 'Other (fee on delivery)' : (order.delivery_place ?? '—');

    const togglePayment = () => {
        router.put(`/portal/orders/${order.id}`, { payment_status: isPaid ? 'unpaid' : 'paid' }, routerOpts());
    };

    const updateStatus = (s) => {
        if (s === 'completed' && !isPaid) {
            toast.error('Mark the order as paid before completing.');
            return;
        }
        router.put(`/portal/orders/${order.id}`, { status: s }, routerOpts());
    };

    const isReceived = status === 'received';
    const isPreparing = status === 'preparing';
    const isReady = status === 'ready';
    const isOnTheWay = status === 'on_the_way';

    return (
        <div
            className={`rounded-2xl border-2 p-5 transition-all ${
                isCompleted ? 'opacity-60 border-surface-200 dark:border-surface-700' : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-md hover:shadow-lg'
            } ${isHighlighted ? 'highlight-ring' : ''}`}
        >
            <div className="flex justify-between items-start gap-3 mb-3 flex-wrap">
                <span className="font-mono font-bold text-surface-700 dark:text-surface-200">#{order.reference ?? order.id}</span>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-300 capitalize">
                        {status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <h3 className="font-bold text-lg text-surface-800 dark:text-surface-100">{order.customer_name ?? 'Walk-in'}</h3>
            {order.customer_phone && (
                <p className="text-sm text-surface-500 flex items-center gap-1.5 mt-0.5">
                    <i className="ph ph-phone text-surface-400"></i>
                    {order.customer_phone}
                </p>
            )}
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-50/60 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-700 px-3 py-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">{deliveryPlace}</span>
            </div>

            {isCompleted ? (
                <div className="mt-4 p-3 bg-surface-100/50 dark:bg-surface-800/50 rounded-xl space-y-1.5 border border-surface-200/50 dark:border-surface-700/50">
                    {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span><span className="font-bold text-primary-600 dark:text-primary-400">{item.quantity}x</span> {item.name}</span>
                            <span className="font-bold">{formatCurrency(Number((item.price ?? 0) * (item.quantity ?? 0)))}</span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between font-bold text-surface-800 dark:text-surface-200">
                        <span>Total</span>
                        <span className="text-primary-600 dark:text-primary-400">{formatCurrency(Number(order.total))}</span>
                    </div>
                </div>
            ) : (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={togglePayment}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePayment(); } }}
                    aria-label={isPaid ? 'Mark unpaid (click to toggle)' : 'Mark paid (click to toggle)'}
                    className="mt-4 p-3 bg-surface-100/50 dark:bg-surface-800/50 rounded-xl space-y-2 border border-surface-200/50 dark:border-surface-700/50 cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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

            <div className="flex flex-col gap-2 mt-4">
                {isReady && (
                    <button
                        type="button"
                        onClick={() => updateStatus('on_the_way')}
                        className="w-full font-semibold py-2 rounded-xl border-2 border-primary-400 dark:border-primary-500/60 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-500/20 active:scale-[0.99]"
                    >
                        Mark on the way
                    </button>
                )}
                {isOnTheWay && (
                    <button
                        type="button"
                        onClick={() => {
                            if (!isPaid) {
                                toast.error('Mark the order as paid before completing.');
                                return;
                            }
                            updateStatus('completed');
                        }}
                        title={!isPaid ? 'Mark as paid first' : undefined}
                        className={`w-full font-semibold py-2 rounded-xl active:scale-[0.99] ${
                            isPaid
                                ? 'bg-primary-600 text-white hover:bg-primary-700'
                                : 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400 hover:opacity-90'
                        }`}
                    >
                        Mark delivered
                    </button>
                )}
                <Link
                    href={`/portal/orders?highlight=${order.id}`}
                    className="w-full font-semibold py-2 rounded-xl border-2 border-primary-400 dark:border-primary-500/60 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-500/20 active:scale-[0.99] text-center"
                    title="Change status on the Orders page"
                >
                    Go to Orders
                </Link>
            </div>
        </div>
    );
}

function ManageDeliveryAreasDialog({ deliveryAreas = [], open, onOpenChange }) {
    const addForm = useForm({ name: '', is_free: true, fee: null, sort_order: 0 });
    const editForm = useForm({ name: '', is_free: true, fee: null, sort_order: 0 });
    const [editingArea, setEditingArea] = useState(null);

    const addArea = (e) => {
        e.preventDefault();
        addForm.post('/portal/delivery-areas', { onSuccess: () => addForm.reset() });
    };

    const startEdit = (area) => {
        setEditingArea(area);
        editForm.setData({
            name: area.name ?? '',
            is_free: !!area.is_free,
            fee: area.fee ?? null,
            sort_order: area.sort_order ?? 0,
        });
        editForm.clearErrors();
    };

    const submitEdit = (e) => {
        e.preventDefault();
        if (!editingArea) return;
        editForm.put(`/portal/delivery-areas/${editingArea.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingArea(null);
            },
        });
    };

    const cancelEdit = () => {
        setEditingArea(null);
        editForm.reset();
        editForm.clearErrors();
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Delivery areas
                    </DialogTitle>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                        Define areas for delivery orders. These options appear when creating an order with Delivery fulfillment.
                    </p>
                </DialogHeader>
                <div className="space-y-4">
                    {deliveryAreas.length === 0 ? (
                        <p className="text-sm text-surface-500 dark:text-surface-400 rounded-lg border border-dashed border-surface-200 dark:border-surface-700 p-4 text-center">
                            No delivery areas yet. Add one below.
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            {deliveryAreas.map((area) => (
                                <div key={area.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3">
                                    <div>
                                        <span className="font-semibold text-surface-900 dark:text-white">{area.name}</span>
                                        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
                                            {area.is_free ? 'Free' : area.fee != null && area.fee !== '' ? formatCurrency(Number(area.fee)) : 'Fee on delivery'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(area)}
                                            className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => window.confirm(`Remove "${area.name}"?`) && router.delete(`/portal/delivery-areas/${area.id}`)}
                                            className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium"
                                            aria-label="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-6">
                        {editingArea && (
                            <form onSubmit={submitEdit} className="space-y-4">
                                <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                                    Edit delivery area
                                    <span className="ml-2 inline-flex items-center rounded-full bg-surface-100 dark:bg-surface-700 px-2 py-0.5 text-xs font-medium text-surface-600 dark:text-surface-300">
                                        {editingArea.name}
                                    </span>
                                </h4>
                                <label className="block">
                                    <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Name</span>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                        placeholder="e.g. Municipal Hall"
                                    />
                                </label>
                                <div>
                                    <span className="text-sm font-semibold text-surface-700 dark:text-surface-300 block mb-2">Charge</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => editForm.setData((d) => ({ ...d, is_free: true, fee: null }))}
                                            className={`
                                                rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-colors text-left
                                                ${editForm.data.is_free === true
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-500'
                                                    : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500'
                                                }
                                            `}
                                        >
                                            Free
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editForm.setData((d) => ({ ...d, is_free: false, fee: null }))}
                                            className={`
                                                rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-colors text-left
                                                ${editForm.data.is_free === false
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-500'
                                                    : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500'
                                                }
                                            `}
                                        >
                                            Custom fee
                                        </button>
                                    </div>
                                    {!editForm.data.is_free && (
                                        <div className="mt-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={editForm.data.fee ?? ''}
                                                onChange={(e) => editForm.setData('fee', e.target.value === '' ? null : Number(e.target.value))}
                                                className="w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                                placeholder="Fee (₱) — leave blank for fee on delivery"
                                            />
                                        </div>
                                    )}
                                </div>
                                {Object.keys(editForm.errors).length > 0 && (
                                    <ul className="text-sm text-red-600 dark:text-red-400">
                                        {Object.entries(editForm.errors).map(([k, v]) => (
                                            <li key={k}>{v}</li>
                                        ))}
                                    </ul>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={editForm.processing}
                                        className="py-2 px-4 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50"
                                    >
                                        {editForm.processing ? 'Saving...' : 'Save changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="py-2 px-3 rounded-xl border border-surface-300 dark:border-surface-600 text-sm font-semibold text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        <form onSubmit={addArea} className="space-y-4">
                            <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Add delivery area</h4>
                            <label className="block">
                                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Name</span>
                                <input
                                    type="text"
                                    required
                                    value={addForm.data.name}
                                    onChange={(e) => addForm.setData('name', e.target.value)}
                                    className="mt-1 w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                    placeholder="e.g. Municipal Hall"
                                />
                            </label>
                            <div>
                                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300 block mb-2">Charge</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => addForm.setData((d) => ({ ...d, is_free: true, fee: null }))}
                                        className={`
                                            rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-colors text-left
                                            ${addForm.data.is_free === true
                                                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-500'
                                                : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500'
                                            }
                                        `}
                                    >
                                        Free
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addForm.setData((d) => ({ ...d, is_free: false, fee: null }))}
                                        className={`
                                            rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-colors text-left
                                            ${addForm.data.is_free === false
                                                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-500'
                                                : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500'
                                            }
                                        `}
                                    >
                                        Custom fee
                                    </button>
                                </div>
                                {!addForm.data.is_free && (
                                    <div className="mt-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={addForm.data.fee ?? ''}
                                            onChange={(e) => addForm.setData('fee', e.target.value === '' ? null : Number(e.target.value))}
                                            className="w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                                            placeholder="Fee (₱) — leave blank for fee on delivery"
                                        />
                                    </div>
                                )}
                            </div>
                            {Object.keys(addForm.errors).length > 0 && (
                                <ul className="text-sm text-red-600 dark:text-red-400">
                                    {Object.entries(addForm.errors).map(([k, v]) => (
                                        <li key={k}>{v}</li>
                                    ))}
                                </ul>
                            )}
                            <button type="submit" disabled={addForm.processing} className="py-2 px-4 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50">
                                {addForm.processing ? 'Adding...' : 'Add area'}
                            </button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const DELIVERIES_VIEW_MODE_KEY = 'deliveriesViewMode';

export default function Deliveries({ orders = [], deliveryAreas = [], highlight }) {
    const highlightRef = useRef(null);
    usePortalOrdersLive({ getIncomingToastMessage: (p) => getIncomingOrderToastMessage('deliveries', p) });
    const [searchQuery, setSearchQuery] = useState('');
    const [manageOpen, setManageOpen] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window === 'undefined') return 'card';
        return window.localStorage?.getItem(DELIVERIES_VIEW_MODE_KEY) || 'card';
    });
    const [activeHighlight, setActiveHighlight] = useState(() => (highlight ? String(highlight) : null));
    const highlightTimeoutRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && viewMode) {
            window.localStorage?.setItem(DELIVERIES_VIEW_MODE_KEY, viewMode);
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
        () => filterOrdersBySearch(orders, searchQuery, { extraFields: ['delivery_place'] }),
        [orders, searchQuery]
    );

    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <PageHeader
                    title={
                        <>
                            Delivery <span className="bg-gradient-to-r from-primary-500 to-orange-400 bg-clip-text text-transparent [text-shadow:0_1px_2px_rgb(0_0_0_/_0.12)] dark:[text-shadow:0_1px_2px_rgb(0_0_0_/_0.35)]">orders</span>
                        </>
                    }
                    description="Track and fulfill delivery orders. Mark paid and update status."
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
                                aria-label="Search delivery orders"
                            />
                        </div>
                        <Link
                            href="/portal/orders"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 smooth-hover"
                        >
                            ← Back to orders
                        </Link>
                        <button
                            type="button"
                            onClick={() => setManageOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40 px-4 py-2 text-sm font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        >
                            <MapPin className="h-4 w-4" />
                            Manage delivery areas
                        </button>
                        <Link href="/portal/orders/completed" className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline py-2">
                            Completed orders
                        </Link>
                    </div>
                </PageHeader>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-0" />
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
                                    ? 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
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
                                    ? 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
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
                        <i className="ph-thin ph-truck text-6xl text-surface-300 dark:text-surface-700 mb-4" aria-hidden />
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No delivery orders</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">
                            Delivery orders will appear here when customers choose delivery. Switch to card view to mark paid and update status.
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
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Phone</th>
                                        <th className="py-2.5 px-3 font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider text-xs">Area</th>
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
                                        const deliveryPlace = order.delivery_place === 'Other (paid on delivery)' ? 'Other (fee)' : (order.delivery_place ?? '—');
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
                                                    {order.customer_phone ?? '—'}
                                                </td>
                                                <td className="py-2.5 px-3 text-xs text-surface-600 dark:text-surface-400 max-w-[140px] truncate" title={deliveryPlace}>
                                                    {deliveryPlace}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded-full bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-300 text-xs font-semibold capitalize">
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
                                                                onClick={() => router.put(`/portal/orders/${order.id}`, { status: 'on_the_way' }, routerOpts())}
                                                                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border-2 border-primary-400 dark:border-primary-500/60 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-500/20"
                                                            >
                                                                Mark on the way
                                                            </button>
                                                        )}
                                                        {status === 'on_the_way' && (
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
                                                                Mark delivered
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
                                            <DeliveryOrderCard order={order} isHighlighted={isHighlight} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="shrink-0 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 text-xs text-surface-500 dark:text-surface-400">
                            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} · Pickup slot assignment is on the Pickup counter page.
                        </div>
                    </div>
                )}
            </section>

            <ManageDeliveryAreasDialog deliveryAreas={deliveryAreas} open={manageOpen} onOpenChange={setManageOpen} />
        </PortalLayout>
    );
}
