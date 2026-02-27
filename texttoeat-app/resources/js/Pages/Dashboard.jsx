import { Link } from '@inertiajs/react';
import PortalLayout from '../Layouts/PortalLayout';

export default function Dashboard({ metrics = {} }) {
    const { orders_today = 0, ready_delivery = 0, ready_pickup = 0, completed_today = 0 } = metrics;
    return (
        <PortalLayout>
            <section className="flex flex-col gap-8 animate-fade-in">
                <h1 className="text-4xl font-extrabold text-surface-900 dark:text-white">Dashboard</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
                        <p className="text-sm text-surface-500 dark:text-surface-400">Orders today</p>
                        <p className="text-2xl font-bold text-surface-900 dark:text-white">{orders_today}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
                        <p className="text-sm text-surface-500 dark:text-surface-400">Ready (delivery)</p>
                        <p className="text-2xl font-bold text-surface-900 dark:text-white">{ready_delivery}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
                        <p className="text-sm text-surface-500 dark:text-surface-400">Ready (pickup)</p>
                        <p className="text-2xl font-bold text-surface-900 dark:text-white">{ready_pickup}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
                        <p className="text-sm text-surface-500 dark:text-surface-400">Completed today</p>
                        <p className="text-2xl font-bold text-surface-900 dark:text-white">{completed_today}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/portal/orders" className="rounded-xl border-2 border-primary-500 px-4 py-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10">Orders</Link>
                    <Link href="/portal/deliveries" className="rounded-xl border-2 border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">Deliveries</Link>
                    <Link href="/portal/pickup" className="rounded-xl border-2 border-amber-500 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10">Pickup</Link>
                    <Link href="/portal/walkin" className="rounded-xl border-2 border-violet-500 px-4 py-2 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10">Walk-in</Link>
                    <Link href="/portal/quick-orders" className="rounded-xl border-2 border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">Create order</Link>
                    <Link href="/portal/menu-items" className="rounded-xl border-2 border-surface-300 px-4 py-2 text-sm font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800">Menu items</Link>
                </div>
            </section>
        </PortalLayout>
    );
}
