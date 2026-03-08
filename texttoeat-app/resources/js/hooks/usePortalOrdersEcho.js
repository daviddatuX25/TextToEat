import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

/**
 * Subscribe to portal.orders channel and reload on order updates.
 * Only subscribes when Echo is available (e.g. on portal pages).
 * Optional getIncomingToastMessage(payload) may return a string to show a toast before reload.
 */
export function usePortalOrdersEcho(options = {}) {
    const getIncomingToastMessageRef = useRef(options.getIncomingToastMessage);
    getIncomingToastMessageRef.current = options.getIncomingToastMessage;

    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;
        const channel = window.Echo.private('portal.orders');
        channel.listen('.order.updated', (payload) => {
            const fn = getIncomingToastMessageRef.current;
            if (typeof fn === 'function') {
                const message = fn(payload);
                if (message) toast.success(message);
            }
            router.reload({ preserveScroll: true });
        });
        return () => {
            channel.stopListening('.order.updated');
            window.Echo.leave('portal.orders');
        };
    }, []);
}
