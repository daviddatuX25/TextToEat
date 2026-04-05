import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
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

    // Domain based on max individual channel value so each series aligns to the Y-axis
    const maxVal = Math.max(
        1,
        ...chartData.flatMap((d) => [d.walkin, d.delivery, d.pickup])
    );

    return (
        <div className={`flex w-full flex-1 flex-col min-h-[280px] ${className}`.trim()}>
            <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <defs>
                            <linearGradient id="dashAreaWalkin" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="dashAreaDelivery" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="dashAreaPickup" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
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
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const walkin = payload.find((p) => p.dataKey === 'walkin')?.value ?? 0;
                                const delivery = payload.find((p) => p.dataKey === 'delivery')?.value ?? 0;
                                const pickup = payload.find((p) => p.dataKey === 'pickup')?.value ?? 0;
                                const total = walkin + delivery + pickup;
                                return (
                                    <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-md dark:border-surface-700 dark:bg-surface-800">
                                        <p className="text-xs font-semibold text-surface-800 dark:text-surface-100">{label}</p>
                                        <ul className="mt-1 space-y-0.5 text-xs text-surface-600 dark:text-surface-300">
                                            <li>Walk-in: {safeFormatCurrency(walkin)}</li>
                                            <li>Delivery: {safeFormatCurrency(delivery)}</li>
                                            <li>Pickup: {safeFormatCurrency(pickup)}</li>
                                        </ul>
                                        <p className="mt-1.5 border-t border-surface-200 dark:border-surface-600 pt-1 text-xs font-semibold text-surface-800 dark:text-surface-100">
                                            Total: {safeFormatCurrency(total)}
                                        </p>
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
                        {/* No stackId — each area goes from 0 to its own value so Y-axis labels match */}
                        <Area type="monotone" dataKey="walkin" name="walkin" stroke="#8b5cf6" fill="url(#dashAreaWalkin)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="delivery" name="delivery" stroke="#f97316" fill="url(#dashAreaDelivery)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="pickup" name="pickup" stroke="#f59e0b" fill="url(#dashAreaPickup)" strokeWidth={1.5} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
