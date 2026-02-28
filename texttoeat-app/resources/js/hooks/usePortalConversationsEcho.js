import { useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Subscribe to portal.conversations channel and reload on conversation updates.
 */
export function usePortalConversationsEcho() {
    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;
        const channel = window.Echo.private('portal.conversations');
        channel.listen('.conversation.updated', () => {
            router.reload({ preserveScroll: true });
        });
        return () => {
            channel.stopListening('.conversation.updated');
            window.Echo.leave('portal.conversations');
        };
    }, []);
}
