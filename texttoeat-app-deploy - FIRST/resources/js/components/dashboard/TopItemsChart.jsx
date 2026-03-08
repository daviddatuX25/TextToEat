import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

export default function TopItemsChart({ data, formatCurrency, maxItems = 8 }) {
    const hasData = Array.isArray(data) && data.length > 0;

    if (!hasData) {
        return (
            <div className="flex h-64 items-center justify-center text-xs text-surface-500 dark:text-surface-400">
                No completed orders yet today.
            </div>
        );
    }

    const trimmed = data.slice(0, maxItems);

    const chartData = trimmed.map((row) => ({
        name: row.name || 'Unknown item',
        total_qty: Number(row.total_qty ?? 0),
        total_revenue: Number(row.total_revenue ?? 0),
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
                <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                        formatter={(value, name) => {
                            if (name === 'total_revenue') {
                                return [safeFormatCurrency(value), 'Revenue'];
                            }
                            if (name === 'total_qty') {
                                return [value, 'Qty sold'];
                            }
                            return [value, name];
                        }}
                        labelFormatter={(label) => `${label}`}
                    />
                    <Bar
                        dataKey="total_revenue"
                        name="Revenue"
                        radius={[0, 4, 4, 0]}
                        fill="#22c55e"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

