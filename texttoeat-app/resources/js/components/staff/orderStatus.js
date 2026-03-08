/**
 * Returns the fulfillment status one step before the current one, or null if at received.
 * @param {{ status: string, delivery_type?: string }} order
 * @returns {string|null}
 */
export function getPreviousStatus(order) {
    const status = typeof order.status === 'string' ? order.status : order.status?.value ?? 'received';
    const isDelivery = (order.delivery_type ?? '') === 'delivery';

    if (status === 'cancelled') return null;
    if (status === 'completed') {
        return isDelivery ? 'on_the_way' : 'ready';
    }
    if (status === 'on_the_way') return 'ready';
    if (status === 'ready') return 'preparing';
    if (status === 'preparing') return 'received';
    return null;
}
