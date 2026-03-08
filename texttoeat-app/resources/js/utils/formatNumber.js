/**
 * Format a number as Philippine Peso with comma thousands and 2 decimals (e.g. ₱1,234.56).
 * @param {number} amount - Value to format (NaN/undefined treated as 0)
 * @returns {string}
 */
export function formatCurrency(amount) {
    const value = Number.isFinite(amount) ? amount : 0;
    return '₱' + value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format an integer with comma thousands (e.g. 1,234).
 * @param {number} n - Value to format (NaN/undefined treated as 0)
 * @returns {string}
 */
export function formatNumber(n) {
    const value = Number.isFinite(n) ? n : 0;
    return Math.round(value).toLocaleString('en-PH');
}
