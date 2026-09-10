import MainLayout from "@/Layouts/MainLayout";
import { Head, router } from "@inertiajs/react";
import {
    ArrowDownCircle,
    ArrowLeft,
    ArrowUpCircle,
    Barcode,
    Calendar,
    RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────
// StockLog Page
//
// Displays the full IN/OUT audit trail for a single product variant.
// Table columns: Date | Reason | Cost (IN) | IN | OUT | Balance | Recorded By
//
// The balance column shows the RUNNING balance — each row shows what
// the cumulative stock was after that particular transaction.
// This mirrors the Excel-style ledger view that Arachchi Studio uses.
//
// Props (from InventoryController::logs()):
//   variant  — the product variant (with product + category + inventory)
//   logs     — paginated StockLog records with running balance attached
// ─────────────────────────────────────────────
import { useState, Fragment } from 'react';

export default function StockLog({ variant, logs }) {
    const product = variant.product;
    const category = product?.category;
    const inventory = variant.inventory;

    // Track which rows are expanded to show history details/brief explanation
    const [expandedRows, setExpandedRows] = useState([]);

    const toggleRow = (id) => {
        setExpandedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
    };

    return (
        <MainLayout pageTitle="Stock Log">
            <Head title={`Stock Log — ${variant.sku}`} />

            <div className="space-y-6">
                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {/* Back button */}
                        <button
                            onClick={() => router.get(route("inventory.index"))}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-500"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {product?.name}
                                </h2>
                                {/* Size / Grade badge */}
                                {(variant.size || variant.grade_type) && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                                        {[variant.size, variant.grade_type]
                                            .filter(Boolean)
                                            .join(" / ")}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {/* SKU */}
                                <span className="inline-flex items-center gap-1.5 font-mono">
                                    <Barcode className="w-3.5 h-3.5" />
                                    {variant.sku}
                                </span>
                                {/* Category */}
                                <span>·</span>
                                <span>{category?.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Reload button */}
                    <button
                        onClick={() => router.reload()}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* ── Current Stock Summary Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                            {inventory?.current_stock ?? 0}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{product?.uom}</p>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/30">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total IN</p>
                        <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {logs.data?.reduce(
                                (sum, l) => (l.type === "IN" ? sum + Number(l.quantity) : sum),
                                0
                            ).toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-100 dark:border-red-900/30">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total OUT</p>
                        <p className="mt-2 text-3xl font-bold text-red-500 dark:text-red-400">
                            {logs.data?.reduce(
                                (sum, l) => (l.type === "OUT" ? sum + Number(l.quantity) : sum),
                                0
                            ).toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Alert</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                            {inventory?.low_stock_threshold ?? 10}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">threshold</p>
                    </div>
                </div>

                {/* ── Log Table ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Transaction History
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            Most recent first
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700/40">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cost (IN)</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">IN</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-red-500 dark:text-red-400 uppercase">OUT</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Recorded By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {logs.data?.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-16 text-center text-gray-400"
                                        >
                                            No stock movements recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.data?.map((log) => (
                                        <Fragment key={log.id}>
                                            <tr
                                                onClick={() => toggleRow(log.id)}
                                                className={`cursor-pointer transition-colors ${expandedRows.includes(log.id)
                                                        ? 'bg-blue-50/50 dark:bg-blue-900/10'
                                                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                                                    }`}
                                            >
                                                {/* Date */}
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 pointer-events-none select-none">
                                                    {new Date(log.date).toLocaleDateString("en-LK", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </td>

                                                {/* Reason + type badge */}
                                                <td className="px-6 py-4 pointer-events-none select-none">
                                                    <div className="flex items-center gap-2">
                                                        {log.type === "IN" ? (
                                                            <ArrowUpCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        ) : (
                                                            <ArrowDownCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                        )}
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {log.reason ?? "—"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Cost details */}
                                                <td className="px-6 py-4 pointer-events-none select-none">
                                                    {log.type === "IN" && (log.purchase_cost || log.shipping_cost || log.other_cost) ? (
                                                        <div className="text-xs text-gray-500 space-y-0.5">
                                                            {Number(log.purchase_cost) > 0 && <div>Pur: LKR {log.purchase_cost}</div>}
                                                            {Number(log.shipping_cost) > 0 && <div>Ship: LKR {log.shipping_cost}</div>}
                                                            {Number(log.other_cost) > 0 && <div>Other: LKR {log.other_cost}</div>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>

                                                {/* IN quantity */}
                                                <td className="px-6 py-4 text-right pointer-events-none select-none">
                                                    {log.type === "IN" ? (
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                            +{log.quantity}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>

                                                {/* OUT quantity */}
                                                <td className="px-6 py-4 text-right pointer-events-none select-none">
                                                    {log.type === "OUT" ? (
                                                        <span className="font-bold text-red-500 dark:text-red-400">
                                                            -{log.quantity}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>

                                                {/* Running balance */}
                                                <td className="px-6 py-4 text-right pointer-events-none select-none">
                                                    <span
                                                        className={`font-bold ${log.balance < (inventory?.low_stock_threshold ?? 10)
                                                                ? "text-red-500"
                                                                : "text-gray-900 dark:text-white"
                                                            }`}
                                                    >
                                                        {log.balance}
                                                    </span>
                                                </td>

                                                {/* Recorded by */}
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 pointer-events-none select-none">
                                                    {log.user?.name ?? "System"}
                                                </td>
                                            </tr>

                                            {/* Expandable row for notes */}
                                            {expandedRows.includes(log.id) && (
                                                <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-t-0">
                                                    <td colSpan={7} className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 italic border-l-4 border-l-primary-500">
                                                        <div className="font-semibold text-xs text-gray-400 not-italic uppercase tracking-wide mb-1 font-sans">Brief Explanation / Note</div>
                                                        {log.notes ? log.notes : "No additional explanation provided for this transaction."}
                                                        <div className="mt-2 text-xs text-gray-400 not-italic font-mono">
                                                            Transaction recorded at: {new Date(log.created_at).toLocaleString('en-LK')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-sm text-gray-500">
                            <span>
                                Page {logs.current_page} of {logs.last_page}
                            </span>
                            <div className="flex gap-2">
                                {logs.prev_page_url && (
                                    <button
                                        onClick={() => router.get(logs.prev_page_url)}
                                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Previous
                                    </button>
                                )}
                                {logs.next_page_url && (
                                    <button
                                        onClick={() => router.get(logs.next_page_url)}
                                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
