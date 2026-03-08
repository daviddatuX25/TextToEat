/**
 * Filters orders by a case-insensitive substring search across common fields.
 * @param {Array<object>} orders - List of order objects
 * @param {string} query - Search string (trimmed and lowercased internally)
 * @param {{ extraFields?: string[] }} options - Optional. extraFields: additional order keys to search (e.g. 'delivery_place', 'order_marker')
 * @returns {Array<object>} Filtered orders
 */
export function filterOrdersBySearch(orders, query, options = {}) {
    const q = (query || '').trim().toLowerCase();
    if (q === '') return orders;

    const baseFields = ['reference', 'customer_name', 'customer_phone'];
    const idStr = (o) => String(o.id ?? '');
    const extraFields = options.extraFields ?? [];

    return orders.filter((order) => {
        const ref = (order.reference ?? idStr(order)) ?? '';
        const name = (order.customer_name ?? '') || '';
        const phone = (order.customer_phone ?? '') || '';
        const values = [ref, name, phone];
        extraFields.forEach((key) => {
            const v = order[key];
            values.push(v != null && typeof v === 'string' ? v : String(v ?? ''));
        });
        return values.some((v) => v.toLowerCase().includes(q));
    });
}
