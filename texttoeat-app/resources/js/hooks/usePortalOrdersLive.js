import { usePortalOrdersEcho } from './usePortalOrdersEcho';
import { usePortalRefresh } from './usePortalRefresh';

/**
 * Realtime orders: Echo when available (Pusher/Reverb) for instant updates;
 * always run polling as fallback (faster when Echo absent, slower when Echo present).
 * Use on Orders, Deliveries, PickupCounter, WalkinCounter.
 * Optional options.getIncomingToastMessage(payload) returns a string to show a toast before reload.
 */
export function usePortalOrdersLive(options = {}) {
    usePortalOrdersEcho({ getIncomingToastMessage: options.getIncomingToastMessage });
    const hasEcho = typeof window !== 'undefined' && window.Echo;
    // When Echo is missing or unreliable, poll every 15s. When Echo exists, poll every 45s as backup.
    usePortalRefresh(true, hasEcho ? 45000 : 15000);
}
