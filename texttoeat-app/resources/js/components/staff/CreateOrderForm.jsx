import { useForm } from '@inertiajs/react';
import { Minus, Plus } from 'lucide-react';
import { Input } from '../ui/Input';

const FULFILLMENT_OPTIONS = [
    { value: 'walkin', walkin_type: 'dine_in', label: 'Dine in', delivery_type: 'pickup', delivery_place: null, delivery_fee: null },
    { value: 'walkin', walkin_type: 'takeout', label: 'Take out', delivery_type: 'pickup', delivery_place: null, delivery_fee: null },
    { value: 'pickup', walkin_type: null, label: 'Pickup', delivery_type: 'pickup', delivery_place: null, delivery_fee: null },
    { value: 'delivery', walkin_type: null, label: 'Delivery', delivery_type: 'delivery', delivery_place: null, delivery_fee: null },
];

function initialCart(menuItems) {
    return (Array.isArray(menuItems) ? menuItems : [])
        .filter((m) => m && m.id != null)
        .reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {});
}

export function CreateOrderForm({
    menuItems = [],
    diningMarkers = [],
    diningMarkersUnavailable = [],
    deliveryAreas = [],
    pickupSlots = [],
}) {
    const pickupValues = Array.isArray(pickupSlots) && pickupSlots.length > 0
        ? pickupSlots.map((s) => (typeof s === 'string' ? s : s?.value ?? s))
        : [];
    const deliveryOptions = Array.isArray(deliveryAreas) && deliveryAreas.length > 0
        ? deliveryAreas
        : [{ id: 0, name: 'Other (paid on delivery)', is_free: false, fee: null }];

    const form = useForm({
        customer_name: '',
        customer_phone: '',
        fulfillment: 'walkin',
        walkin_type: 'dine_in',
        delivery_place: deliveryOptions[0]?.name ?? null,
        delivery_fee: deliveryOptions[0]?.is_free ? 0 : (deliveryOptions[0]?.fee ?? null),
        pickup_slot: pickupValues[0] ?? null,
        order_marker: '',
        items: initialCart(menuItems),
    });

    const isDelivery = form.data.fulfillment === 'delivery';
    const isWalkin = form.data.fulfillment === 'walkin';
    const isPickup = form.data.fulfillment === 'pickup';

    const setFulfillment = (opt) => {
        form.setData({
            fulfillment: opt.value,
            walkin_type: opt.walkin_type,
            delivery_place: opt.delivery_type === 'delivery' ? (deliveryOptions[0]?.name ?? null) : null,
            delivery_fee: opt.delivery_type === 'delivery' ? (deliveryOptions[0]?.is_free ? 0 : (deliveryOptions[0]?.fee ?? null)) : null,
            pickup_slot: opt.delivery_type === 'pickup' && !opt.walkin_type ? (pickupValues[0] ?? null) : null,
            order_marker: opt.walkin_type ? '' : null,
        });
    };

    const setDeliveryPlace = (area) => {
        form.setData({
            delivery_place: area.name,
            delivery_fee: area.is_free ? 0 : (area.fee ?? null),
        });
    };

    const setQuantity = (id, qty) => {
        const next = { ...form.data.items };
        next[id] = Math.max(0, qty);
        form.setData('items', next);
    };

    const cartLines = Object.entries(form.data.items || {})
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
            const item = menuItems.find((m) => String(m.id) === String(id));
            return item ? { menu_item_id: parseInt(id, 10), quantity: qty, name: item.name, price: Number(item.price) } : null;
        })
        .filter(Boolean);

    const total = cartLines.reduce((sum, line) => sum + line.price * line.quantity, 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (cartLines.length === 0) return;
        const payload = {
            customer_name: form.data.customer_name,
            customer_phone: form.data.customer_phone || null,
            fulfillment: form.data.fulfillment,
            walkin_type: form.data.walkin_type || null,
            delivery_place: isDelivery ? form.data.delivery_place : null,
            delivery_fee: isDelivery ? form.data.delivery_fee : null,
            pickup_slot: isPickup || isWalkin ? (form.data.pickup_slot || null) : null,
            order_marker: isWalkin ? (form.data.order_marker || null) : null,
            items: cartLines,
        };
        form.transform(() => payload).post('/portal/quick-orders', {
            onSuccess: () => form.reset('items', initialCart(menuItems)),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left: Menu grid for easy choosing */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400 mb-3">Today&apos;s menu</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 overflow-y-auto max-h-[50vh] lg:max-h-[calc(90vh-12rem)] pr-1">
                    {(menuItems || []).map((item) => {
                        const qty = form.data.items?.[item.id] ?? 0;
                        const disabled = item.is_sold_out || (item.units_today != null && item.units_today <= 0);
                        return (
                            <div
                                key={item.id}
                                className={`rounded-xl border-2 overflow-hidden transition-all ${
                                    qty > 0
                                        ? 'border-primary-400 dark:border-primary-500/60 bg-primary-50/50 dark:bg-primary-500/10'
                                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 hover:border-surface-300 dark:hover:border-surface-600'
                                } ${disabled ? 'opacity-60' : ''}`}
                            >
                                {item.image_url && (
                                    <div className="aspect-[4/3] bg-surface-100 dark:bg-surface-800 relative">
                                        <img
                                            src={item.image_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        {qty > 0 && (
                                            <span className="absolute top-2 right-2 h-7 min-w-[28px] px-1.5 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
                                                {qty}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="p-3">
                                    <p className="font-semibold text-surface-800 dark:text-surface-100 text-sm line-clamp-2">{item.name}</p>
                                    <p className="text-primary-600 dark:text-primary-400 font-bold text-sm mt-0.5">₱{Number(item.price).toFixed(2)}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(item.id, qty - 1)}
                                            disabled={qty <= 0 || disabled}
                                            className="h-8 w-8 rounded-lg border border-surface-200 dark:border-surface-600 flex items-center justify-center text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                                            aria-label="Decrease"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="flex-1 text-center font-bold text-surface-800 dark:text-surface-100 text-sm">{qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(item.id, qty + 1)}
                                            disabled={disabled}
                                            className="h-8 w-8 rounded-lg border border-primary-300 dark:border-primary-500/50 bg-primary-50 dark:bg-primary-500/20 flex items-center justify-center text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-500/30 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                                            aria-label="Increase"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Order options sidebar */}
            <div className="lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
                <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-4 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400">Order options</h3>

                    <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">Fulfillment</label>
                        <div className="flex flex-wrap gap-2">
                            {FULFILLMENT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setFulfillment(opt)}
                                    className={`rounded-xl border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        form.data.fulfillment === opt.value && form.data.walkin_type === opt.walkin_type
                                            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                                            : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300 dark:hover:border-surface-500'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isDelivery && (
                        <div>
                            <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Delivery area</label>
                            <select
                                value={form.data.delivery_place ?? ''}
                                onChange={(e) => {
                                    const area = deliveryOptions.find((a) => a.name === e.target.value);
                                    if (area) setDeliveryPlace(area);
                                }}
                                className="w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                            >
                                {deliveryOptions.map((a) => (
                                    <option key={a.id} value={a.name}>
                                        {a.name} {a.is_free ? '(free)' : a.fee != null ? `₱${Number(a.fee).toFixed(2)}` : 'fee on delivery'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(isPickup || isWalkin) && pickupValues.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Pickup slot</label>
                            <select
                                value={form.data.pickup_slot ?? ''}
                                onChange={(e) => form.setData('pickup_slot', e.target.value || null)}
                                className="w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                            >
                                <option value="">—</option>
                                {pickupValues.map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {isWalkin && diningMarkers.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Table / marker</label>
                            <select
                                value={form.data.order_marker ?? ''}
                                onChange={(e) => form.setData('order_marker', e.target.value || null)}
                                className="w-full rounded-lg border-2 border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                            >
                                <option value="">—</option>
                                {diningMarkers.map((m) => {
                                    const val = typeof m === 'string' ? m : m?.value ?? m;
                                    const taken = diningMarkersUnavailable.includes(val);
                                    return (
                                        <option key={val} value={val} disabled={taken}>
                                            {val}{taken ? ' (taken)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Input
                            id="create_customer_name"
                            label="Customer name"
                            type="text"
                            required
                            value={form.data.customer_name}
                            onChange={(e) => form.setData('customer_name', e.target.value)}
                            error={form.errors.customer_name}
                        />
                        <Input
                            id="create_customer_phone"
                            label="Phone (optional)"
                            type="text"
                            value={form.data.customer_phone}
                            onChange={(e) => form.setData('customer_phone', e.target.value)}
                            error={form.errors.customer_phone}
                        />
                    </div>
                </div>

                {/* Cart summary */}
                <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 p-4 space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400">Order summary</h3>
                    {cartLines.length === 0 ? (
                        <p className="text-sm text-surface-500 dark:text-surface-400">Add items from the menu.</p>
                    ) : (
                        <>
                            {cartLines.map((line) => (
                                <div key={line.menu_item_id} className="flex justify-between text-sm">
                                    <span><span className="font-bold text-primary-600 dark:text-primary-400">{line.quantity}x</span> {line.name}</span>
                                    <span className="font-bold">₱{(line.price * line.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span className="text-primary-600 dark:text-primary-400">₱{total.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>

                {Object.keys(form.errors).length > 0 && (
                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                        {Object.entries(form.errors).map(([k, v]) => (
                            <li key={k}>{v}</li>
                        ))}
                    </ul>
                )}

                <button
                    type="submit"
                    disabled={form.processing || cartLines.length === 0}
                    className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {form.processing ? 'Creating…' : 'Create order'}
                </button>
            </div>
        </form>
    );
}
