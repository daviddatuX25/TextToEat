import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function ChannelPerformanceChart({ data, formatCurrency }) {
    const hasData = Array.isArray(data) && data.length > 0;

    if (!hasData) {
        return (
            <div className="flex h-64 items-center justify-center text-xs text-surface-500 dark:text-surface-400">
                No orders yet today.
            </div>
        );
    }

    const chartData = data.map((row) => ({
        channel: row.channel || 'Unknown',
        orders_today: Number(row.orders_today ?? 0),
        revenue_today: Number(row.revenue_today ?? 0),
    }));

    const safeFormatCurrency =
        typeof formatCurrency === 'function'
            ? formatCurrency
            : (amount) => {
                  const value = Number.isFinite(amount) ? amount : 0;
                  return `₱${value.toFixed(2)}`;
              };

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="channel"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                        formatter={(value, name) => {
                            if (name === 'revenue_today') {
                                return [safeFormatCurrency(value), 'Revenue today'];
                            }
                            if (name === 'orders_today') {
                                return [value, 'Orders today'];
                            }
                            return [value, name];
                        }}
                        labelFormatter={(label) => `Channel: ${label}`}
                    />
                    <Legend
                        formatter={(value) => {
                            if (value === 'orders_today') return 'Orders';
                            if (value === 'revenue_today') return 'Revenue';
                            return value;
                        }}
                    />
                    <Bar
                        dataKey="orders_today"
                        name="Orders"
                        radius={[4, 4, 0, 0]}
                        fill="#4f46e5"
                    />
                    <Bar
                        dataKey="revenue_today"
                        name="Revenue"
                        radius={[4, 4, 0, 0]}
                        fill="#10b981"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

