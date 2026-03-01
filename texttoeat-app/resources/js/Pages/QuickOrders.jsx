import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import CreateOrderForm from '../components/staff/CreateOrderForm';

export default function QuickOrders({ menuItems = [], deliveryAreas = [], pickupSlots = [], diningMarkers = [], diningMarkersUnavailable = [] }) {
    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <header className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Create order
                        </h1>
                        <Link
                            href="/portal/orders"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 smooth-hover"
                        >
                            ← Back to orders
                        </Link>
                    </div>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">
                        Create new orders for delivery, pickup, or walk-in. Add items, set fulfillment type, and submit.
                    </p>
                </header>

                <div className="w-full">
                    <CreateOrderForm
                        menuItems={menuItems}
                        diningMarkers={diningMarkers}
                        diningMarkersUnavailable={diningMarkersUnavailable}
                        deliveryAreas={deliveryAreas}
                        pickupSlots={pickupSlots}
                        standalonePage
                    />
                </div>
            </section>
        </PortalLayout>
    );
}
