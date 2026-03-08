import { useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Polling refresh for portal pages. Only refreshes when tab is visible.
 * @param {boolean} enabled - Whether polling is active
 * @param {number} intervalMs - Interval in milliseconds
 */
export function usePortalRefresh(enabled, intervalMs = 15000) {
    useEffect(() => {
        if (!enabled || intervalMs <= 0) return;

        const refresh = () => {
            if (document.visibilityState === 'visible') {
                router.reload({ preserveScroll: true });
            }
        };

        const id = setInterval(refresh, intervalMs);
        return () => clearInterval(id);
    }, [enabled, intervalMs]);
}
