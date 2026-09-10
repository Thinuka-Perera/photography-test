const ALL_HOURS = Array.from({ length: 24 }, (_, h) => h);

const formatHour = (h) => {
    if (h === 0) return '12a';
    if (h < 12) return `${h}a`;
    if (h === 12) return '12p';
    return `${h - 12}p`;
};

export default function HourlyChart({ data }) {
    // data: [{ hour: 9, count: 3, revenue: '450.00' }, ...]
    const revenueByHour = Object.fromEntries(
        data.map((d) => [d.hour, parseFloat(d.revenue)]),
    );

    const hours = ALL_HOURS.map((h) => ({
        hour: h,
        revenue: revenueByHour[h] ?? 0,
    }));

    const maxRevenue = Math.max(
        ...hours.map((h) => h.revenue),
        1,
    );

    const chartWidth = 700;
    const chartHeight = 140;
    const barWidth = chartWidth / 24 - 4;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Revenue by Hour</h3>

            {data.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-300 dark:text-gray-500 text-sm">
                    No transactions yet today
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
                        className="w-full min-w-[400px]"
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label="Revenue by hour bar chart"
                    >
                        {hours.map((h, i) => {
                            const barH =
                                h.revenue > 0
                                    ? Math.max(4, (h.revenue / maxRevenue) * chartHeight)
                                    : 2;
                            const x = i * (chartWidth / 24) + 2;
                            const y = chartHeight - barH;

                            return (
                                <g key={h.hour}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barH}
                                        rx={3}
                                        fill={h.revenue > 0 ? '#3b82f6' : '#e2e8f0'}
                                    />
                                    {h.hour % 3 === 0 && (
                                        <text
                                            x={x + barWidth / 2}
                                            y={chartHeight + 16}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fill="#64748b"
                                        >
                                            {formatHour(h.hour)}
                                        </text>
                                    )}
                                    {h.revenue > 0 && (
                                        <title>
                                            {formatHour(h.hour)} — Rs. {h.revenue.toFixed(2)}
                                        </title>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            )}
        </div>
    );
}
