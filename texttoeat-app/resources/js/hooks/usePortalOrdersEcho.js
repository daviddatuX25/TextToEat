import { useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Subscribe to portal.orders channel and reload on order updates.
 * Only subscribes when Echo is available (e.g. on portal pages).
 */
export function usePortalOrdersEcho() {
    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;
        const channel = window.Echo.private('portal.orders');
        channel.listen('.order.updated', () => {
            router.reload({ preserveScroll: true });
        });
        return () => {
            channel.stopListening('.order.updated');
            window.Echo.leave('portal.orders');
        };
    }, []);
}
