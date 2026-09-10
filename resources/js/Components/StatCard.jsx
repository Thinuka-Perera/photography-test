import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@inertiajs/react";

export default function StatCard({
    title,
    value,
    percentage,
    trend = "up", // 'up' or 'down'
    icon: Icon,
    iconBgColor = "bg-primary-100 dark:bg-primary-900/30",
    iconColor = "text-primary-500",
    linkText = "View detail",
    linkHref = "#",
}) {
    const isPositive = trend === "up";

    return (
        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 hover:-translate-y-1">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {title}
                </h3>
                {Icon && (
                    <div
                        className={`p-3 rounded-xl ${iconBgColor} transition-transform duration-300 group-hover:scale-110`}
                    >
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                )}
            </div>

            {/* Value */}
            <div className="mb-3">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {value}
                </span>
            </div>

            {/* Percentage change — omit when null/undefined (no fake “vs yesterday”) */}
            {percentage !== null && percentage !== undefined && (
                <div className="flex items-center gap-2 mb-4">
                    <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            isPositive
                                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        }`}
                    >
                        {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                        ) : (
                            <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{percentage}%</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        vs yesterday
                    </span>
                </div>
            )}

            {/* Link */}
            <Link
                href={linkHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors group/link"
            >
                {linkText}
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}

// Preset variants for common use cases
export function OrderStatCard({ title, value, percentage, trend }) {
    return (
        <StatCard
            title={title}
            value={value}
            percentage={percentage}
            trend={trend}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-500"
        />
    );
}

export function SalesStatCard({ title, value, percentage, trend }) {
    return (
        <StatCard
            title={title}
            value={value}
            percentage={percentage}
            trend={trend}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-500"
        />
    );
}

export function WarningStatCard({ title, value, percentage, trend }) {
    return (
        <StatCard
            title={title}
            value={value}
            percentage={percentage}
            trend={trend}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-500"
        />
    );
}
