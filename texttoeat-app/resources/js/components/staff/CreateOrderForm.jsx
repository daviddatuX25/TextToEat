import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import { Input, Button, Card } from '../ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Plus, Minus, Utensils, ChevronUp, X } from 'lucide-react';

const filterLabelClass = 'block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5';
const filterSelectClass =
    'w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent';

const DELIVERY_PLACES = [
    { value: 'Municipal Hall', label: 'Municipal Hall (free)' },
    { value: 'Within Barangay Tagudin', label: 'Within Barangay Tagudin (free)' },
    { value: 'Other (paid on delivery)', label: 'Other (fee on delivery)' },
];

function CreateOrderForm({
    menuItems = [],
    deliveryAreas = [],
    pickupSlots = [],
    diningMarkers = [],
    diningMarkersUnavailable = [],
    standalonePage = false,
}) {
    const { props } = usePage();
    const rawErrors = props.errors || {};
    const serverErrors = useMemo(() => {
        const o = {};
        for (const [k, v] of Object.entries(rawErrors)) {
            o[k] = Array.isArray(v) ? v[0] : v;
        }
        return o;
    }, [rawErrors]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [fulfillment, setFulfillment] = useState('walkin');
    const [orderMarker, setOrderMarker] = useState('');
    const [pickupSlot, setPickupSlot] = useState('');
    const [deliveryPlace, setDeliveryPlace] = useState(DELIVERY_PLACES[0]?.value ?? '');
    const [cart, setCart] = useState([]);
    const [mobileFormOpen, setMobileFormOpen] = useState(false);
    const [touched, setTouched] = useState({});
    const [mounted, setMounted] = useState(false);
    const formSectionRef = useRef(null);
    const itemsGridRef = useRef(null);

    useEffect(() => {
        if (standalonePage) setMounted(true);
    }, [standalonePage]);

    const adjustQty = useCallback((menuItemId, delta) => {
        setCart((prev) => {
            const idx = prev.findIndex((l) => l.menu_item_id === menuItemId);
            if (idx >= 0) {
                const line = prev[idx];
                const newQty = Math.max(0, line.quantity + delta);
                if (newQty === 0) return prev.filter((_, i) => i !== idx);
                return prev.map((l, i) => (i === idx ? { ...l, quantity: newQty } : l));
            }
            if (delta > 0) {
                const item = menuItems.find((m) => m.id === menuItemId);
                if (item) {
                    return [...prev, { menu_item_id: item.id, name: item.name, price: Number(item.price) ?? 0, quantity: 1 }];
                }
            }
            return prev;
        });
    }, [menuItems]);

    const addOne = useCallback((item) => {
        adjustQty(item.id, 1);
    }, [adjustQty]);

    const categories = useMemo(() => {
        const cats = [...new Set((menuItems || []).map((m) => m.category).filter(Boolean))].sort();
        return ['All', ...cats];
    }, [menuItems]);

    const [categoryFilter, setCategoryFilter] = useState('All');
    const filteredItems = useMemo(() => {
        if (categoryFilter === 'All' || !categoryFilter) return menuItems || [];
        return (menuItems || []).filter((m) => m.category === categoryFilter);
    }, [menuItems, categoryFilter]);

    const total = cart.reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0);
    const nameRequired = fulfillment !== 'walkin';
    const canSubmit = (nameRequired ? customerName.trim() !== '' : true) && cart.length > 0 && total > 0;

    const nameError = serverErrors.customer_name ?? (touched.customer_name && nameRequired && !customerName.trim() ? 'Customer name is required for pickup/delivery' : null);
    const phoneError = serverErrors.customer_phone ?? null;
    const itemsError = serverErrors.items ?? (touched.items && cart.length === 0 ? 'Add at least one item' : null);

    const hasServerErrors = Object.keys(serverErrors).length > 0;
    useEffect(() => {
        if (hasServerErrors && formSectionRef.current) {
            formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (standalonePage) setMobileFormOpen(true);
        }
    }, [hasServerErrors, standalonePage]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSubmit) {
            setTouched({
                customer_name: true,
                items: true,
            });
            if (standalonePage) setMobileFormOpen(true);
            formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        setTouched({});
        const delivery_type = fulfillment === 'delivery' ? 'delivery' : 'pickup';
        const delivery_place = fulfillment === 'delivery' ? deliveryPlace : null;
        const delivery_fee = fulfillment === 'delivery' && deliveryPlace === 'Other (paid on delivery)' ? null : 0;
        const pickup_slot = fulfillment === 'pickup' ? (pickupSlot || null) : null;
        const order_marker = fulfillment === 'walkin' ? (orderMarker || null) : null;
        const is_walkin = fulfillment === 'walkin';
        const customer_name = is_walkin && !customerName.trim() ? 'Walk-in' : customerName.trim();

        const payload = {
            customer_name,
            is_walkin,
            customer_phone: customerPhone.trim() || '',
            delivery_type,
            delivery_place,
            delivery_fee,
            pickup_slot,
            order_marker,
            items: cart.map((line) => ({
                menu_item_id: line.menu_item_id,
                name: line.name,
                price: line.price,
                quantity: line.quantity,
            })),
        };

        router.post('/portal/quick-orders', payload, {
            onSuccess: () => {
                setCustomerName('');
                setCustomerPhone('');
                setOrderMarker('');
                setPickupSlot('');
                setDeliveryPlace(DELIVERY_PLACES[0]?.value ?? '');
                setCart([]);
                setTouched({});
                if (standalonePage) setMobileFormOpen(false);
            },
        });
    };

    const markerTaken = (value) => value && diningMarkersUnavailable && diningMarkersUnavailable.includes(value);

    const toggleOrderMarker = (value) => {
        if (markerTaken(value)) return;
        setOrderMarker((prev) => (prev === value ? '' : value));
    };

    const togglePickupSlot = (value) => {
        setPickupSlot((prev) => (prev === value ? '' : value));
    };

    const itemsSection = (
        <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2 shrink-0">Items</h3>
            {itemsError && (
                <p className="text-xs font-medium text-destructive mb-2" role="alert">
                    {itemsError}
                </p>
            )}
            {categories.length > 1 && (
                <div className="mb-3 shrink-0 max-w-[200px]">
                    <label htmlFor="create-order-category" className={filterLabelClass}>
                        Category
                    </label>
                    <select
                        id="create-order-category"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className={filterSelectClass}
                        aria-label="Filter menu by category"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div
                ref={itemsGridRef}
                className={`grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pb-2 ${standalonePage ? 'lg:grid-cols-3 lg:gap-4 lg:content-start' : 'lg:grid-cols-4 max-h-[400px]'}`}
            >
                {filteredItems.map((item) => {
                    const line = cart.find((l) => l.menu_item_id === item.id);
                    const qty = line ? line.quantity : 0;
                    return (
                        <Card key={item.id} className="overflow-hidden transition-all hover:shadow-md flex flex-col">
                            <div className="aspect-[4/3] bg-surface-100 dark:bg-surface-800 relative overflow-hidden shrink-0">
                                {item.image_url ? (
                                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Utensils className="h-12 w-12 text-surface-300 dark:text-surface-600" />
                                    </div>
                                )}
                                {item.category && (
                                    <span className="absolute top-2 left-2 inline-flex items-center max-w-[calc(100%-1rem)] rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-primary-500/90 text-white shadow-sm truncate">
                                        {item.category}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 flex flex-col flex-1 min-h-0">
                                <div className="flex justify-between items-baseline gap-2">
                                    <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100 line-clamp-2 min-w-0 leading-tight">
                                        {item.name}
                                    </h3>
                                    <span className="font-bold text-sm text-primary-600 dark:text-primary-400 shrink-0 tabular-nums">
                                        ₱{Number(item.price).toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    {qty > 0 ? (
                                        <div className="flex items-center rounded-lg border-2 border-surface-200 dark:border-surface-600 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => adjustQty(item.id, -1)}
                                                className="p-1.5 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus className="h-3.5 w-3.5" />
                                            </button>
                                            <span className="min-w-[1.5rem] text-center text-xs font-bold tabular-nums">
                                                {qty}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => addOne(item)}
                                                className="p-1.5 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={() => addOne(item)}
                                            className="gap-1 text-xs py-1.5 px-2"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
            {cart.length > 0 && (
                <p className="mt-2 text-sm font-semibold text-primary-600 dark:text-primary-400 shrink-0">
                    Total: ₱{total.toFixed(2)}
                </p>
            )}
        </div>
    );

    const formSection = (
        <div ref={formSectionRef} className="space-y-6">
            <div className="space-y-3">
                <Input
                    id="customer_name"
                    label={fulfillment === 'walkin' ? 'Customer name (optional)' : 'Customer name'}
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, customer_name: true }))}
                    required={nameRequired}
                    placeholder={fulfillment === 'walkin' ? 'Walk-in' : 'Name'}
                    error={nameError ?? undefined}
                />
                <Input
                    id="customer_phone"
                    label="Phone (optional)"
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder=""
                    error={phoneError ?? undefined}
                />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Fulfillment</h3>

                {/* Toggle: Walk-in | Pickup | Delivery */}
                <div
                    role="group"
                    aria-label="Fulfillment type"
                    className="inline-flex p-1 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
                >
                    {[
                        { value: 'walkin', label: 'Walk-in' },
                        { value: 'pickup', label: 'Pickup' },
                        { value: 'delivery', label: 'Delivery' },
                    ].map((opt) => {
                        const selected = fulfillment === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setFulfillment(opt.value)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                    selected
                                        ? 'bg-white dark:bg-surface-700 text-primary-700 dark:text-primary-300 shadow-sm border border-surface-200 dark:border-surface-600'
                                        : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {/* Dining markers: square with small radius */}
                {fulfillment === 'walkin' && (
                    <div className="mt-4">
                        <p className={filterLabelClass}>Dining marker (optional)</p>
                        <div className="pb-2 -mx-1 max-h-[160px] overflow-y-auto">
                            <div className="p-1 flex flex-wrap gap-2">
                                {(diningMarkers || []).map((m) => {
                                    const taken = markerTaken(m.value);
                                    const selected = orderMarker === m.value;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleOrderMarker(m.value)}
                                            disabled={taken}
                                            className={`rounded-lg border-2 w-10 h-10 flex items-center justify-center text-xs font-semibold transition-colors shrink-0 ${
                                                taken
                                                    ? 'border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-surface-400 cursor-not-allowed'
                                                    : selected
                                                        ? 'border-primary-500 bg-primary-500 text-white dark:bg-primary-600 dark:border-primary-600'
                                                        : 'border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-primary-400 dark:hover:border-primary-500'
                                            }`}
                                        >
                                            {m.value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pickup slots: circles */}
                {fulfillment === 'pickup' && (
                    <div className="mt-4">
                        <p className={filterLabelClass}>Pickup slot (optional)</p>
                        <div className="overflow-x-auto pb-2 -mx-1">
                            <div className="flex flex-wrap gap-2 p-1">
                                {(pickupSlots || []).map((s) => {
                                    const selected = pickupSlot === s.value;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => togglePickupSlot(s.value)}
                                            className={`rounded-full w-10 h-10 flex items-center justify-center text-xs font-semibold transition-colors shrink-0 ${
                                                selected
                                                    ? 'bg-primary-500 text-white dark:bg-primary-600 ring-2 ring-primary-300 dark:ring-primary-700 ring-offset-2 dark:ring-offset-surface-900'
                                                    : 'border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:border-primary-400 dark:hover:border-primary-500'
                                            }`}
                                        >
                                            {s.value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Delivery area */}
                {fulfillment === 'delivery' && (
                    <div className="mt-4">
                        <label htmlFor="create-order-delivery-place" className={filterLabelClass}>
                            Delivery area
                        </label>
                        <select
                            id="create-order-delivery-place"
                            value={deliveryPlace}
                            onChange={(e) => setDeliveryPlace(e.target.value)}
                            className={filterSelectClass}
                            aria-label="Delivery area"
                        >
                            {DELIVERY_PLACES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <Button type="submit" disabled={!canSubmit} variant="primary" className="w-full">
                Create order
            </Button>
        </div>
    );

    if (standalonePage) {
        return (
            <>
                {/* Desktop: 2 columns with independent scroll; mobile: single column */}
                <form onSubmit={handleSubmit} className="flex flex-col lg:grid lg:grid-cols-[1fr_min(22rem)] lg:gap-6 lg:min-h-[28rem] lg:h-[calc(100vh-11rem)]">
                    <div className="flex flex-col min-h-0 min-w-0 order-1 lg:overflow-y-auto lg:pr-4 lg:pb-4">
                        {itemsSection}
                    </div>
                    <div className="max-lg:hidden flex flex-col min-h-0 min-w-[320px] order-2 overflow-y-auto lg:pl-4 lg:border-l border-surface-200 dark:border-surface-700">
                        {formSection}
                    </div>
                </form>

                {/* Mobile: fixed bottom bar */}
                {standalonePage &&
                    mounted &&
                    typeof document !== 'undefined' &&
                    document.body &&
                    createPortal(
                        <div
                            className="fixed left-0 right-0 bottom-0 z-[100] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 border-t border-surface-200 dark:border-surface-700 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] lg:hidden"
                            style={{ position: 'fixed', left: 0, right: 0, bottom: 0 }}
                            data-create-order-footer
                        >
                            <button
                                type="button"
                                onClick={() => setMobileFormOpen(true)}
                                className={`w-full flex items-center justify-between gap-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 px-4 transition-colors ${cart.length > 0 ? 'proceed-blink' : ''}`}
                            >
                                <span className="text-left">
                                    {cart.length === 0 ? 'Add items to continue' : (
                                        <>
                                            <span className="block text-white/90 text-xs font-medium">Proceed to checkout</span>
                                            <span className="block text-sm mt-0.5">{cart.length} item{cart.length !== 1 ? 's' : ''} · ₱{total.toFixed(2)}</span>
                                        </>
                                    )}
                                </span>
                                <ChevronUp className="h-5 w-5 shrink-0" aria-hidden />
                            </button>
                        </div>,
                        document.body
                    )}
                <div className="h-24 lg:hidden flex-shrink-0" aria-hidden />

                {/* ─── Mobile bottom sheet ─── */}
                <Dialog open={mobileFormOpen} onOpenChange={setMobileFormOpen}>
                    <DialogContent
                        className="fixed bottom-0 left-0 right-0 top-auto translate-y-0 translate-x-0 max-h-[75vh] rounded-t-3xl rounded-b-none border-b-0 sm:max-w-none w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom pb-[env(safe-area-inset-bottom)]"
                        onPointerDownOutside={(e) => e.target === e.currentTarget && setMobileFormOpen(false)}
                    >
                        <div className="flex flex-col flex-1 min-h-0">
                            {/* Sheet header */}
                            <div className="shrink-0 pt-3 pb-4">
                                {/* Drag handle */}
                                <div className="w-10 h-1.5 rounded-full bg-surface-300 dark:bg-surface-600 mx-auto mb-4" aria-hidden />

                                {/* Title row with close button */}
                                <div className="flex items-center justify-between px-6">
                                    <DialogHeader className="p-0">
                                        <DialogTitle className="text-base font-semibold text-surface-900 dark:text-surface-100">
                                            Customer &amp; fulfillment
                                        </DialogTitle>
                                    </DialogHeader>

                                    {/* Pill-style close button */}
                                    <button
                                        type="button"
                                        onClick={() => setMobileFormOpen(false)}
                                        className="flex items-center gap-1.5 rounded-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 pl-2.5 pr-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-surface-100 transition-colors touch-manipulation"
                                        aria-label="Close"
                                    >
                                        <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable form body */}
                            <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6 overscroll-contain">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {formSection}
                                </form>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {itemsSection}
            {formSection}
        </form>
    );
}

export { CreateOrderForm };
export default CreateOrderForm;
