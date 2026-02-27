import { useState, useEffect, useRef } from 'react';
import { Link, router, usePage, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import PortalLayout from '../Layouts/PortalLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { MapPin, Trash2 } from 'lucide-react';

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
    const isConfirmed = status === 'confirmed';
    const isReady = status === 'ready';
    const isOnTheWay = status === 'on_the_way';

    return (
        <div
            className={`rounded-2xl border-2 p-5 transition-all ${
                isCompleted ? 'opacity-60 border-surface-200 dark:border-surface-700' : 'border-blue-300 dark:border-blue-500/40 bg-white dark:bg-surface-900 shadow-md hover:shadow-lg'
            } ${isHighlighted ? 'highlight-ring' : ''}`}
        >
            <div className="flex justify-between items-start gap-3 mb-3 flex-wrap">
                <span className="font-mono font-bold text-surface-700 dark:text-surface-200">#{order.reference ?? order.id}</span>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 capitalize">
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
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-3 py-2">
                <MapPin className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">{deliveryPlace}</span>
            </div>

            {isCompleted ? (
                <div className="mt-4 p-3 bg-surface-100/50 dark:bg-surface-800/50 rounded-xl space-y-1.5 border border-surface-200/50 dark:border-surface-700/50">
                    {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span><span className="font-bold text-primary-600 dark:text-primary-400">{item.quantity}x</span> {item.name}</span>
                            <span className="font-bold">₱{Number((item.price ?? 0) * (item.quantity ?? 0)).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between font-bold text-surface-800 dark:text-surface-200">
                        <span>Total</span>
                        <span className="text-primary-600 dark:text-primary-400">₱{Number(order.total).toFixed(2)}</span>
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

            <div className="flex flex-col gap-2 mt-4">
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                        <ul className="space-y-2">
                            {deliveryAreas.map((area) => (
                                <li key={area.id} className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3">
                                    <div>
                                        <span className="font-semibold text-surface-900 dark:text-white">{area.name}</span>
                                        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
                                            {area.is_free ? 'Free' : area.fee != null && area.fee !== '' ? `₱${Number(area.fee).toFixed(2)}` : 'Fee on delivery'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(area)}
                                            className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-sm font-medium"
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
                                </li>
                            ))}
                        </ul>
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
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="edit_is_free"
                                                checked={editForm.data.is_free === true}
                                                onChange={() => editForm.setData((d) => ({ ...d, is_free: true, fee: null }))}
                                                className="rounded-full border-surface-300 text-primary-600"
                                            />
                                            <span className="text-sm">Free</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="edit_is_free"
                                                checked={editForm.data.is_free === false}
                                                onChange={() => editForm.setData((d) => ({ ...d, is_free: false, fee: null }))}
                                                className="rounded-full border-surface-300 text-primary-600"
                                            />
                                            <span className="text-sm">Custom charge</span>
                                        </label>
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
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_is_free"
                                            checked={addForm.data.is_free === true}
                                            onChange={() => addForm.setData((d) => ({ ...d, is_free: true, fee: null }))}
                                            className="rounded-full border-surface-300 text-primary-600"
                                        />
                                        <span className="text-sm">Free</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_is_free"
                                            checked={addForm.data.is_free === false}
                                            onChange={() => addForm.setData((d) => ({ ...d, is_free: false, fee: null }))}
                                            className="rounded-full border-surface-300 text-primary-600"
                                        />
                                        <span className="text-sm">Custom charge</span>
                                    </label>
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

export default function Deliveries({ orders = [], deliveryAreas = [], highlight }) {
    const highlightRef = useRef(null);
    const [manageOpen, setManageOpen] = useState(false);
    const [activeHighlight, setActiveHighlight] = useState(() => (highlight ? String(highlight) : null));
    const highlightTimeoutRef = useRef(null);

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

    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                        <i className="ph-bold ph-truck"></i>
                        Delivery
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                        Delivery <span className="bg-gradient-to-r from-primary-500 to-orange-400 bg-clip-text text-transparent">orders</span>
                    </h1>
                </header>

                <div className="flex flex-wrap items-center gap-4">
                    <Link href="/portal/orders/completed" className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                        View completed orders →
                    </Link>
                    <button
                        type="button"
                        onClick={() => setManageOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                    >
                        <MapPin className="h-4 w-4" />
                        Manage delivery areas
                    </button>
                </div>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                        <i className="ph-thin ph-truck text-6xl text-surface-300 dark:text-surface-700 mb-4"></i>
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No delivery orders</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">Delivery orders will appear here when customers choose delivery.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {orders.map((order) => {
                                const isHighlight = activeHighlight != null && String(order.id) === String(activeHighlight);
                                return (
                                    <div key={order.id} ref={isHighlight ? highlightRef : null} className={isHighlight ? 'p-2 -m-2' : ''}>
                                        <DeliveryOrderCard order={order} isHighlighted={isHighlight} />
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-surface-400 dark:text-surface-500">Delivery orders only. Pickup slot assignment is on the Pickup counter page.</p>
                    </>
                )}
            </section>

            <ManageDeliveryAreasDialog deliveryAreas={deliveryAreas} open={manageOpen} onOpenChange={setManageOpen} />
        </PortalLayout>
    );
}
