import { useForm } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import { Button, Card, Input, SectionHeading } from '../components/ui';

const DELIVERY_PLACES = [
    { value: 'Municipal Hall', label: 'Municipal Hall (free delivery)' },
    { value: 'Within Barangay Tagudin', label: 'Within Barangay Tagudin (free delivery)' },
    { value: 'Other (paid on delivery)', label: 'Other area (delivery fee by distance, paid on delivery)' },
];

export default function Checkout({ cart = [], total = 0 }) {
    const form = useForm({
        customer_name: '',
        customer_phone: '',
        delivery_type: 'pickup',
        delivery_place: null,
        delivery_fee: 0,
    });
    const isDelivery = form.data.delivery_type === 'delivery';

    function handleSubmit(e) {
        e.preventDefault();
        const payload = {
            ...form.data,
            delivery_place: isDelivery ? form.data.delivery_place : null,
            delivery_fee: isDelivery && form.data.delivery_place === 'Other (paid on delivery)' ? null : 0,
        };
        form.transform(() => payload).post('/checkout');
    }

    return (
        <AppLayout>
            <section className="flex flex-col gap-6">
                <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                    Checkout
                </h1>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div>
                        <SectionHeading>Order summary</SectionHeading>
                        <Card className="mb-4">
                            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                                {cart.map((line) => (
                                    <li key={line.menu_item_id} className="flex justify-between p-3 text-sm">
                                        <span>{line.name} × {line.quantity}</span>
                                        <span>₱{(parseFloat(line.price) * parseInt(line.quantity, 10)).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="border-t border-slate-200 p-3 font-bold dark:border-slate-800">
                                Total: ₱{Number(total).toFixed(2)}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <div className="p-5">
                                <SectionHeading>Fulfillment</SectionHeading>
                                <div className="mt-3 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="delivery_type"
                                            checked={form.data.delivery_type === 'pickup'}
                                            onChange={() => form.setData({ delivery_type: 'pickup', delivery_place: null, delivery_fee: 0 })}
                                            className="rounded-full border-surface-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="font-medium">Pickup</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="delivery_type"
                                            checked={form.data.delivery_type === 'delivery'}
                                            onChange={() => form.setData({ delivery_type: 'delivery', delivery_place: DELIVERY_PLACES[0].value, delivery_fee: 0 })}
                                            className="rounded-full border-surface-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="font-medium">Delivery</span>
                                    </label>
                                    {isDelivery && (
                                        <div className="ml-6 mt-2 space-y-2 border-l-2 border-surface-200 dark:border-surface-700 pl-4">
                                            {DELIVERY_PLACES.map((opt) => (
                                                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="delivery_place"
                                                        checked={form.data.delivery_place === opt.value}
                                                        onChange={() => form.setData({
                                                            delivery_place: opt.value,
                                                            delivery_fee: opt.value === 'Other (paid on delivery)' ? null : 0,
                                                        })}
                                                        className="rounded-full border-surface-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="text-sm">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="p-5">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <SectionHeading>Your details</SectionHeading>
                                    <Input
                                        id="customer_name"
                                        label="Name"
                                        type="text"
                                        value={form.data.customer_name}
                                        onChange={(e) => form.setData('customer_name', e.target.value)}
                                        error={form.errors.customer_name}
                                    />
                                    <Input
                                        id="customer_phone"
                                        label="Phone"
                                        type="text"
                                        value={form.data.customer_phone}
                                        onChange={(e) => form.setData('customer_phone', e.target.value)}
                                        error={form.errors.customer_phone}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        variant="primary"
                                    >
                                        {form.processing ? 'Placing order…' : 'Place order'}
                                    </Button>
                                </form>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>
        </AppLayout>
    );
}
