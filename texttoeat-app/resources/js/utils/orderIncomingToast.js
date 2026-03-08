/**
 * Returns a toast message for the given page when the order event payload is "incoming" for that page.
 * Orders: new or in-progress (received, preparing); or payment-only update (marked paid/unpaid).
 * Pickup/Deliveries/Walk-in: order became ready for that channel.
 * Returns null when no toast should be shown.
 *
 * @param {'orders'|'pickup'|'deliveries'|'walkin'} page
 * @param {{ order_id?: number, reference?: string, status?: string, delivery_type?: string, channel?: string, status_changed?: boolean, payment_status_changed?: boolean, payment_status?: string }} payload
 * @returns {string|null}
 */
export function getIncomingOrderToastMessage(page, payload) {
    const ref = payload?.reference ?? `#${payload?.order_id ?? '?'}`;
    const status = payload?.status ?? '';
    const deliveryType = payload?.delivery_type ?? '';
    const channel = payload?.channel ?? '';
    const statusChanged = payload?.status_changed === true;
    const paymentStatusChanged = payload?.payment_status_changed === true;
    const paymentStatus = payload?.payment_status ?? 'unpaid';

    if (page === 'orders') {
        if (statusChanged) {
            if (status === 'received') return `Order ${ref} – new`;
            if (status === 'preparing') return `Order ${ref} – preparing`;
            return null;
        }
        if (paymentStatusChanged && !statusChanged) {
            return paymentStatus === 'paid' ? `Order ${ref} – marked paid` : `Order ${ref} – marked unpaid`;
        }
        return null;
    }

    if (status !== 'ready') return null;

    if (page === 'pickup' && deliveryType === 'pickup') return `Order ${ref} ready for pickup`;
    if (page === 'deliveries' && deliveryType === 'delivery') return `Order ${ref} ready for delivery`;
    if (page === 'walkin' && channel === 'walkin') return `Order ${ref} ready (walk-in)`;

    return null;
}
