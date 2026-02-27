import { useState, useEffect } from 'react';

/**
 * Shared advanced filter panel for logs pages (orders, chatbot).
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
        <section className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/60 dark:bg-surface-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                    <span className="font-semibold">Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 px-2 py-0.5 text-[11px] font-semibold">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-xs font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                        >
                            Reset
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-0/80 dark:bg-surface-800/80 px-3 py-1.5 text-xs font-semibold text-surface-700 dark:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-700"
                    >
                        <span>{open ? 'Hide filters' : 'Show filters'}</span>
                    </button>
                </div>
            </div>

            {open && (
                <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-xs" onSubmit={handleApply}>
                    <div className="space-y-1">
                        <label className="block font-semibold text-surface-600 dark:text-surface-300">Date from</label>
                        <input
                            type="date"
                            name="date_from"
                            value={local.date_from ?? ''}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block font-semibold text-surface-600 dark:text-surface-300">Date to</label>
                        <input
                            type="date"
                            name="date_to"
                            value={local.date_to ?? ''}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block font-semibold text-surface-600 dark:text-surface-300">{customerLabel}</label>
                        <input
                            type="text"
                            name="customer"
                            value={local.customer ?? ''}
                            onChange={handleChange}
                            placeholder={customerLabel}
                            className="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100"
                        />
                    </div>

                    {context === 'orders' && (
                        <div className="space-y-1">
                            <label className="block font-semibold text-surface-600 dark:text-surface-300">Order reference</label>
                            <input
                                type="text"
                                name="order_reference"
                                value={local.order_reference ?? ''}
                                onChange={handleChange}
                                placeholder="Order reference"
                                className="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100"
                            />
                        </div>
                    )}

                    {statusOptions.length > 0 && (
                        <div className="space-y-1">
                            <span className="block font-semibold text-surface-600 dark:text-surface-300">Status</span>
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map((opt) => (
                                    <label key={opt.value} className="inline-flex items-center gap-1.5">
                                        <input
                                            type="checkbox"
                                            name="status"
                                            value={opt.value}
                                            checked={Array.isArray(local.status) && local.status.includes(opt.value)}
                                            onChange={handleCheckboxChange}
                                            className="h-3 w-3 rounded border-surface-300 dark:border-surface-600"
                                        />
                                        <span className="text-[11px] text-surface-600 dark:text-surface-300">
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {channelOptions.length > 0 && (
                        <div className="space-y-1">
                            <span className="block font-semibold text-surface-600 dark:text-surface-300">Channel</span>
                            <div className="flex flex-wrap gap-2">
                                {channelOptions.map((opt) => (
                                    <label key={opt.value} className="inline-flex items-center gap-1.5">
                                        <input
                                            type="checkbox"
                                            name="channel"
                                            value={opt.value}
                                            checked={Array.isArray(local.channel) && local.channel.includes(opt.value)}
                                            onChange={handleCheckboxChange}
                                            className="h-3 w-3 rounded border-surface-300 dark:border-surface-600"
                                        />
                                        <span className="text-[11px] text-surface-600 dark:text-surface-300">
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {showStaff && staffOptions.length > 0 && (
                        <div className="space-y-1">
                            <label className="block font-semibold text-surface-600 dark:text-surface-300">Staff</label>
                            <select
                                name="staff_id"
                                value={local.staff_id ?? ''}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100"
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

                    {showHasHumanTakeover && (
                        <div className="space-y-1">
                            <span className="block font-semibold text-surface-600 dark:text-surface-300">Human takeover</span>
                            <label className="inline-flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
                                <input
                                    type="checkbox"
                                    checked={Boolean(local.has_human_takeover)}
                                    onChange={handleBooleanChange}
                                    className="h-3 w-3 rounded border-surface-300 dark:border-surface-600"
                                />
                                <span>Show only sessions with human takeover</span>
                            </label>
                        </div>
                    )}

                    <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="inline-flex items-center rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-700 dark:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800"
                        >
                            Clear all
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                        >
                            Apply filters
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

