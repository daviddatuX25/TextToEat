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

export default function RevenueChart({ revenueByHour = [], formatCurrency, className = '' }) {
    const hasData = Array.isArray(revenueByHour) && revenueByHour.length > 0;

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
                <div className="flex flex-1 items-center justify-center text-xs text-surface-500 dark:text-surface-400">
                    No revenue data yet.
                </div>
            </div>
        );
    }

    const chartData = revenueByHour.map((d) => ({
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
            <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            interval={1}
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
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                    <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-md dark:border-surface-700 dark:bg-surface-800">
                                        <p className="text-xs font-semibold text-surface-800 dark:text-surface-100">{label}</p>
                                        <ul className="mt-1 space-y-0.5 text-xs text-surface-600 dark:text-surface-300">
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
                        <Line type="monotone" dataKey="delivery" name="delivery" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="pickup" name="pickup" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
