import { useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line,
} from 'recharts';

export default function RevenueChart({ revenueWeekly = [], revenueMonthly = [], formatCurrency, className = '' }) {
    const [range, setRange] = useState('week');
    const data = range === 'week' ? revenueWeekly : revenueMonthly;
    const xKey = range === 'week' ? 'label' : 'label';
    const hasData = Array.isArray(data) && data.length > 0;

    const safeFormatCurrency =
        typeof formatCurrency === 'function'
            ? formatCurrency
            : (amount) => {
                  const value = Number.isFinite(amount) ? amount : 0;
                  return `₱${value.toFixed(2)}`;
              };

    if (!hasData) {
        return (
            <div className={`flex flex-col min-h-[280px] ${className}`.trim()}>
                <div className="flex justify-end gap-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50 p-1 mb-3 w-fit ml-auto">
                    <button
                        type="button"
                        onClick={() => setRange('week')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${range === 'week' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        Week
                    </button>
                    <button
                        type="button"
                        onClick={() => setRange('month')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${range === 'month' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        Month
                    </button>
                </div>
                <div className="flex flex-1 items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                    No revenue data yet.
                </div>
            </div>
        );
    }

    const chartData = data.map((d) => ({
        ...d,
        walkin: Number(d.walkin ?? 0),
        delivery: Number(d.delivery ?? 0),
        pickup: Number(d.pickup ?? 0),
    }));

    const maxVal = Math.max(
        1,
        ...chartData.flatMap((d) => [d.walkin, d.delivery, d.pickup])
    );

    return (
        <div className={`flex w-full flex-1 flex-col min-h-[280px] ${className}`.trim()}>
            <div className="flex justify-end gap-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50 p-1 mb-3 w-fit ml-auto shrink-0">
                <button
                    type="button"
                    onClick={() => setRange('week')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${range === 'week' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                    Week
                </button>
                <button
                    type="button"
                    onClick={() => setRange('month')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${range === 'month' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                    Month
                </button>
            </div>
            <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey={xKey}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            domain={[0, maxVal]}
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                            formatter={(value) => safeFormatCurrency(value)}
                            labelFormatter={(label) => (range === 'week' ? label : label)}
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md dark:border-slate-700 dark:bg-slate-800">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                                        <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                                            <li>Walk-in: {safeFormatCurrency(payload.find((p) => p.dataKey === 'walkin')?.value ?? 0)}</li>
                                            <li>Delivery: {safeFormatCurrency(payload.find((p) => p.dataKey === 'delivery')?.value ?? 0)}</li>
                                            <li>Pickup: {safeFormatCurrency(payload.find((p) => p.dataKey === 'pickup')?.value ?? 0)}</li>
                                        </ul>
                                    </div>
                                );
                            }}
                        />
                        <Legend
                            formatter={(value) => {
                                if (value === 'walkin') return 'Walk-in';
                                if (value === 'delivery') return 'Delivery';
                                if (value === 'pickup') return 'Pickup';
                                return value;
                            }}
                        />
                        <Line type="monotone" dataKey="walkin" name="walkin" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="delivery" name="delivery" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="pickup" name="pickup" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
