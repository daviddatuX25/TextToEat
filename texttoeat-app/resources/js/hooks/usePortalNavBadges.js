import { useEffect, useState, useRef } from 'react';

const BADGES_URL = '/portal/nav-badges';

const DEFAULT_BADGES = {
    non_ready_orders: 0,
    ready_pickup_orders: 0,
    ready_delivery_orders: 0,
    ready_walkin_orders: 0,
    active_conversations: 0,
    low_stock_meals: 0,
};

/**
 * Fetch nav badge counts from the API.
 * @returns {Promise<{ non_ready_orders: number, ready_pickup_orders: number, ready_delivery_orders: number, active_conversations: number }>}
 */
async function fetchNavBadges(signal) {
    const res = await fetch(BADGES_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        signal,
    });
    if (!res.ok) throw new Error(`Nav badges failed: ${res.status}`);
    const data = await res.json();
    return {
        non_ready_orders: Number(data.non_ready_orders) || 0,
        ready_pickup_orders: Number(data.ready_pickup_orders) || 0,
        ready_delivery_orders: Number(data.ready_delivery_orders) || 0,
        ready_walkin_orders: Number(data.ready_walkin_orders) || 0,
        active_conversations: Number(data.active_conversations) || 0,
        low_stock_meals: Number(data.low_stock_meals) || 0,
    };
}

/**
 * Real-time nav badge counts for the portal sidebar.
 * Fetches on mount, subscribes to Echo (portal.orders, portal.conversations),
 * refetches on .order.updated / .conversation.updated. Polls when Echo is absent.
 */
export function usePortalNavBadges() {
    const [badges, setBadges] = useState(DEFAULT_BADGES);
    const abortRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        abortRef.current = controller;

        const load = () => {
            fetchNavBadges(controller.signal)
                .then((data) => {
                    if (!cancelled) setBadges(data);
                })
                .catch((err) => {
                    if (err.name !== 'AbortError' && !cancelled) {
                        setBadges(DEFAULT_BADGES);
                    }
                });
        };

        load();

        const hasEcho = typeof window !== 'undefined' && window.Echo;
        if (hasEcho) {
            const ordersChannel = window.Echo.private('portal.orders');
            const conversationsChannel = window.Echo.private('portal.conversations');
            ordersChannel.listen('.order.updated', load);
            conversationsChannel.listen('.conversation.updated', load);
            return () => {
                cancelled = true;
                controller.abort();
                ordersChannel.stopListening('.order.updated');
                conversationsChannel.stopListening('.conversation.updated');
                window.Echo.leave('portal.orders');
                window.Echo.leave('portal.conversations');
            };
        }

        const pollId = setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, 45000);
        return () => {
            cancelled = true;
            controller.abort();
            clearInterval(pollId);
        };
    }, []);

    return badges;
}
