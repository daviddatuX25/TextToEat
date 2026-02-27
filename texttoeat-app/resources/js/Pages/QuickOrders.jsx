import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { CreateOrderForm } from '../components/staff/CreateOrderForm';

export default function QuickOrders({ menuItems = [], deliveryAreas = [], pickupSlots = [], diningMarkers = [], diningMarkersUnavailable = [] }) {
    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-4xl font-extrabold text-surface-900 dark:text-white">Create order</h1>
                    <Link href="/portal/orders" className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                        ← Back to orders
                    </Link>
                </div>

                <div className="w-full">
                    <CreateOrderForm
                        menuItems={menuItems}
                        diningMarkers={diningMarkers}
                        diningMarkersUnavailable={diningMarkersUnavailable}
                        deliveryAreas={deliveryAreas}
                        pickupSlots={pickupSlots}
                    />
                </div>
            </section>
        </PortalLayout>
    );
}
