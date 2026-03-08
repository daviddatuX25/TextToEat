import { useState, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

const filterLabelClass = 'block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5';
const filterInputClass =
    'w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent';

/**
 * Shared advanced filter panel for logs pages (orders, chatbot).
 * Styled to match Completed Orders filter panel (collapsible Filters button + same inputs/dropdowns).
 *
 * Props:
 * - context: 'orders' | 'chatbot'
 * - filters: current filter values from the backend
 * - statusOptions: [{ value, label }]
 * - channelOptions: [{ value, label }]
 * - staffOptions: [{ value, label }]
 * - showStaff: boolean
 * - showHasHumanTakeover: boolean
 * - onSubmit: (filters) => void
 */
export function LogFilterPanel({
    context,
    filters = {},
    statusOptions = [],
    channelOptions = [],
    staffOptions = [],
    showStaff = false,
    showHasHumanTakeover = false,
    onSubmit,
}) {
    const [open, setOpen] = useState(false);
    const [local, setLocal] = useState(() => ({
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        customer: filters.customer ?? '',
        status: filters.status ?? [],
        channel: filters.channel ?? [],
        staff_id: filters.staff_id ?? '',
        has_human_takeover: filters.has_human_takeover ?? null,
        order_reference: filters.order_reference ?? '',
    }));

    useEffect(() => {
        setLocal((prev) => ({
            ...prev,
            date_from: filters.date_from ?? '',
            date_to: filters.date_to ?? '',
            customer: filters.customer ?? '',
            status: filters.status ?? [],
            channel: filters.channel ?? [],
            staff_id: filters.staff_id ?? '',
            has_human_takeover: filters.has_human_takeover ?? null,
            order_reference: filters.order_reference ?? '',
        }));
    }, [filters]);

    const toggleArrayValue = (key, value) => {
        setLocal((prev) => {
            const current = Array.isArray(prev[key]) ? prev[key] : [];
            if (current.includes(value)) {
                return { ...prev, [key]: current.filter((v) => v !== value) };
            }
            return { ...prev, [key]: [...current, value] };
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocal((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e) => {
        const { name, value, checked } = e.target;
        if (!checked) {
            toggleArrayValue(name, value);
            return;
        }
        toggleArrayValue(name, value);
    };

    const handleBooleanChange = (e) => {
        const { checked } = e.target;
        setLocal((prev) => ({ ...prev, has_human_takeover: checked ? 1 : null }));
    };

    const handleReset = () => {
        const cleared = {
            date_from: '',
            date_to: '',
            customer: '',
            status: [],
            channel: [],
            staff_id: '',
            has_human_takeover: null,
            order_reference: '',
        };
        setLocal(cleared);
        if (onSubmit) {
            onSubmit(cleared);
        }
    };

    const handleApply = (e) => {
        e.preventDefault();
        if (!onSubmit) return;
        onSubmit(local);
        setOpen(false);
    };

    const activeFilterCount =
        (local.date_from ? 1 : 0) +
        (local.date_to ? 1 : 0) +
        (local.customer ? 1 : 0) +
        (local.order_reference ? 1 : 0) +
        (Array.isArray(local.status) && local.status.length ? 1 : 0) +
        (Array.isArray(local.channel) && local.channel.length ? 1 : 0) +
        (showStaff && local.staff_id ? 1 : 0) +
        (showHasHumanTakeover && local.has_human_takeover ? 1 : 0);

    const customerLabel =
        context === 'orders'
            ? 'Customer (name / phone / reference)'
            : 'Customer name';

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        activeFilterCount > 0
                            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                            : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="rounded-full bg-primary-600 text-white text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center px-1">
                            {activeFilterCount}
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {open && (
                <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-800/50 p-4 space-y-4">
                    <form className="space-y-4" onSubmit={handleApply}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label htmlFor="log-filter-date-from" className={filterLabelClass}>
                                    Date from
                                </label>
                                <input
                                    id="log-filter-date-from"
                                    type="date"
                                    name="date_from"
                                    value={local.date_from ?? ''}
                                    onChange={handleChange}
                                    className={filterInputClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="log-filter-date-to" className={filterLabelClass}>
                                    Date to
                                </label>
                                <input
                                    id="log-filter-date-to"
                                    type="date"
                                    name="date_to"
                                    value={local.date_to ?? ''}
                                    onChange={handleChange}
                                    className={filterInputClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="log-filter-customer" className={filterLabelClass}>
                                    {customerLabel}
                                </label>
                                <input
                                    id="log-filter-customer"
                                    type="text"
                                    name="customer"
                                    value={local.customer ?? ''}
                                    onChange={handleChange}
                                    placeholder={customerLabel}
                                    className={filterInputClass}
                                />
                            </div>

                            {context === 'orders' && (
                                <div>
                                    <label htmlFor="log-filter-order-ref" className={filterLabelClass}>
                                        Order reference
                                    </label>
                                    <input
                                        id="log-filter-order-ref"
                                        type="text"
                                        name="order_reference"
                                        value={local.order_reference ?? ''}
                                        onChange={handleChange}
                                        placeholder="Order reference"
                                        className={filterInputClass}
                                    />
                                </div>
                            )}

                            {showStaff && staffOptions.length > 0 && (
                                <div>
                                    <label htmlFor="log-filter-staff" className={filterLabelClass}>
                                        Staff
                                    </label>
                                    <select
                                        id="log-filter-staff"
                                        name="staff_id"
                                        value={local.staff_id ?? ''}
                                        onChange={handleChange}
                                        className={filterInputClass}
                                    >
                                        <option value="">Any</option>
                                        {staffOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-end gap-4">
                            {statusOptions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-surface-600 dark:text-surface-400">Status</span>
                                    {statusOptions.map((opt) => (
                                        <label key={opt.value} className="inline-flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="status"
                                                value={opt.value}
                                                checked={Array.isArray(local.status) && local.status.includes(opt.value)}
                                                onChange={handleCheckboxChange}
                                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-surface-700 dark:text-surface-300">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {channelOptions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-surface-600 dark:text-surface-400">Channel</span>
                                    {channelOptions.map((opt) => (
                                        <label key={opt.value} className="inline-flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="channel"
                                                value={opt.value}
                                                checked={Array.isArray(local.channel) && local.channel.includes(opt.value)}
                                                onChange={handleCheckboxChange}
                                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-surface-700 dark:text-surface-300">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {showHasHumanTakeover && (
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(local.has_human_takeover)}
                                        onChange={handleBooleanChange}
                                        className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-surface-700 dark:text-surface-300">
                                        Show only sessions with human takeover
                                    </span>
                                </label>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-semibold px-4 py-2 hover:bg-primary-700 transition-colors"
                            >
                                Apply filters
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="inline-flex items-center rounded-lg border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 text-sm font-medium px-4 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

