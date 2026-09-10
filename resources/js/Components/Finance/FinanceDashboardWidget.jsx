// ─────────────────────────────────────────────────────────────────────────────
// FinanceDashboardWidget — Thinuka's Finance Widget
//
// USAGE: Add this component to Dashboard.jsx
//
// 1. Import at top of Dashboard.jsx:
//    import FinanceDashboardWidget from "@/Components/Finance/FinanceDashboardWidget";
//
// 2. Add financeStats to Dashboard props:
//    export default function Dashboard({ inventoryStats, lowStockItems, topProducts, financeStats }) {
//
// 3. Add inside Dashboard JSX, after the Inventory Widgets section:
//    <FinanceDashboardWidget stats={financeStats} />
//
// ─────────────────────────────────────────────────────────────────────────────

import { Link } from "@inertiajs/react";
import { ArrowRight, DollarSign, RotateCcw, TrendingUp } from "lucide-react";

const formatMoneyShort = (val) => {
    const n = Number(val ?? 0);
    if (n >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `LKR ${(n / 1_000).toFixed(1)}K`;
    return "LKR " + n.toLocaleString("en-LK", { minimumFractionDigits: 0 });
};

// Minimal sparkline using SVG
function Sparkline({ data = [] }) {
    if (!data.length) return null;
    const vals = data.map((d) => d.total);
    const max  = Math.max(...vals, 1);
    const w    = 100;
    const h    = 32;
    const pts  = vals
        .map((v, i) => {
            const x = (i / Math.max(vals.length - 1, 1)) * w;
            const y = h - (v / max) * h;
            return `${x},${y}`;
        })
        .join(" ");

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
            <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-emerald-400"
                points={pts}
            />
        </svg>
    );
}

export default function FinanceDashboardWidget({ stats = {} }) {
    const {
        monthRevenue   = 0,
        totalRevenue   = 0,
        monthRefunds   = 0,
        netProfit      = 0,
        openInvoices   = 0,
        pendingRefunds = 0,
        dailyRevenue   = [],
    } = stats;

    const profitPositive = netProfit >= 0;

    return (
        <div className="mb-8">
            {/* Section header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Finance Overview
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Revenue, refunds, and net profit for this month
                    </p>
                </div>
                <Link
                    href={route("finance.invoices.index")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors"
                >
                    View invoices <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {/* Revenue */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatMoneyShort(monthRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-1">All-time: {formatMoneyShort(totalRevenue)}</p>
                    <div className="mt-3">
                        <Sparkline data={dailyRevenue} />
                    </div>
                </div>

                {/* Net Profit */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-xl ${profitPositive ? "bg-blue-100 dark:bg-blue-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                            <TrendingUp className={`w-4 h-4 ${profitPositive ? "text-blue-500" : "text-red-500"}`} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
                    </div>
                    <p className={`text-xl font-bold ${profitPositive ? "text-gray-900 dark:text-white" : "text-red-500"}`}>
                        {formatMoneyShort(netProfit)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">After {formatMoneyShort(monthRefunds)} in refunds</p>
                </div>

                {/* Open Invoices */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <DollarSign className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Open Invoices</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{openInvoices}</p>
                    <Link
                        href={route("finance.invoices.index") + "?status=awaiting_payment"}
                        className="text-xs text-primary-500 hover:underline mt-1 block"
                    >
                        View outstanding →
                    </Link>
                </div>

                {/* Pending Refunds */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-xl ${pendingRefunds > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                            <RotateCcw className={`w-4 h-4 ${pendingRefunds > 0 ? "text-red-500" : "text-gray-400"}`} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Pending Refunds</p>
                    </div>
                    <p className={`text-xl font-bold ${pendingRefunds > 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                        {pendingRefunds}
                    </p>
                    <Link
                        href={route("finance.refunds.index") + "?status=pending"}
                        className="text-xs text-primary-500 hover:underline mt-1 block"
                    >
                        Review now →
                    </Link>
                </div>
            </div>
        </div>
    );
}