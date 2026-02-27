import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';
import { OrderListRow } from '../components/staff/OrderListRow';

export default function CompletedOrders({ orders = [], sort: initialSort = 'created_at', direction: initialDirection = 'desc' }) {
    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <header className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400">
                        <i className="ph-bold ph-check-circle"></i>
                        Completed &amp; cancelled
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                            Completed orders
                        </h1>
                        <Link
                            href="/portal/orders"
                            className="inline-flex items-center gap-2 border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold py-2.5 px-4 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 smooth-hover"
                        >
                            ← Back to orders
                        </Link>
                    </div>
                </header>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                        <i className="ph-thin ph-receipt text-6xl text-surface-300 dark:text-surface-700 mb-4"></i>
                        <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No completed or cancelled orders</h3>
                        <p className="text-surface-500 text-sm max-w-sm mt-2">Completed and cancelled orders will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {orders.map((order) => (
                            <OrderListRow key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
