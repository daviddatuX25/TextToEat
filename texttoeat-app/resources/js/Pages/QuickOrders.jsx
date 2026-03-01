import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import CreateOrderForm from '../components/staff/CreateOrderForm';

export default function QuickOrders({ menuItems = [], deliveryAreas = [], pickupSlots = [], diningMarkers = [], diningMarkersUnavailable = [] }) {
    return (
        <PortalLayout>
            <section className="flex flex-col gap-5 animate-fade-in">
                <header className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                        <i className="ph-bold ph-plus-circle" aria-hidden />
                        Create order
                    </div>
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
