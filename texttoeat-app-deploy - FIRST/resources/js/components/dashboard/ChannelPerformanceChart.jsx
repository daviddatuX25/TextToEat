import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
    Line,
} from 'recharts';

export default function ChannelPerformanceChart({ data, formatCurrency }) {
    const hasData = Array.isArray(data) && data.length > 0;

    if (!hasData) {
        return (
            <div className="flex h-64 items-center justify-center text-xs text-surface-500 dark:text-surface-400">
                No orders yet today.
            </div>
        );
    }

    const safeFormatCurrency =
        typeof formatCurrency === 'function'
            ? formatCurrency
            : (amount) => {
                  const value = Number.isFinite(amount) ? amount : 0;
                  return `₱${value.toFixed(2)}`;
              };

    const chartData = data.map((row) => {
        const orders = Number(row.orders_today ?? 0);
        const completed = Number(row.completed_today ?? 0);
        const revenue = Number(row.revenue_today ?? 0);
        const completionPct = orders > 0 ? Math.round((completed / orders) * 100) : 0;
        return {
            channel: row.channel || 'Unknown',
            orders_today: orders,
            revenue_today: revenue,
            completed_today: completed,
            completion_pct: completionPct,
        };
    });

    const maxOrders = Math.max(1, ...chartData.map((d) => d.orders_today));
    const maxRevenue = Math.max(1, ...chartData.map((d) => d.revenue_today));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="channel"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <YAxis
                        yAxisId="orders"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        domain={[0, maxOrders]}
                        allowDecimals={false}
                    />
                    <YAxis
                        yAxisId="revenue"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        domain={[0, maxRevenue]}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                        content={({ active, payload, label }) => {
                            if (!active || !payload?.length || !label) return null;
                            const d = payload[0]?.payload;
                            if (!d) return null;
                            return (
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md dark:border-slate-700 dark:bg-slate-800">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                        {label}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                        {d.orders_today} order{d.orders_today !== 1 ? 's' : ''} ·{' '}
                                        {safeFormatCurrency(d.revenue_today)} revenue ·{' '}
                                        {d.completion_pct}% completion
                                    </p>
                                </div>
                            );
                        }}
                    />
                    <Legend
                        formatter={(value) => {
                            if (value === 'orders_today') return 'Orders';
                            if (value === 'revenue_today') return 'Revenue';
                            return value;
                        }}
                    />
                    <Bar
                        yAxisId="orders"
                        dataKey="orders_today"
                        name="Orders"
                        radius={[4, 4, 0, 0]}
                        fill="#4f46e5"
                    />
                    <Line
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="revenue_today"
                        name="Revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#10b981' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
