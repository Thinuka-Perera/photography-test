import StatCard from "@/Components/StatCard";
import MainLayout from "@/Layouts/MainLayout";
import { Head, router } from "@inertiajs/react";
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Filter,
    Save,
    TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Editor Commissions Tab
 * Shows all editor commissions for a given month with filters and summary cards.
 * Only visible to Admin/Super Admin.
 */
export default function EditorCommissions({ commissions, summary, filters, editors, current_month_year, auth }) {
    const [selectedEditor, setSelectedEditor] = useState(filters.editor_id || "");
    const [selectedMonth, setSelectedMonth] = useState(filters.month || new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(filters.year || new Date().getFullYear());
    const [selectedStatus, setSelectedStatus] = useState(filters.status || "all");
    const [activeTab, setActiveTab] = useState("all");

    // ── Handle filter apply ────────────────────────────────────────────
    const handleApplyFilters = () => {
        router.get(
            route("payroll.editor-commissions.index"),
            {
                editor_id: selectedEditor || undefined,
                month: selectedMonth,
                year: selectedYear,
                status: selectedStatus,
            },
            { preserveScroll: true }
        );
    };

    // ── Format money ───────────────────────────────────────────────────
    const fmtMoney = (val) => {
        const n = Number(val ?? 0);
        return "LKR " + n.toLocaleString("en-LK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const monthOptions = [
        { value: 1, label: "January" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" },
    ];

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => ({
        value: currentYear - i,
        label: currentYear - i,
    }));

    const allRows = commissions.data ?? [];
    const creationRows = useMemo(
        () => allRows.filter((row) => Number(row.creation_charge_amt ?? 0) > 0),
        [allRows],
    );
    const visibleRows = activeTab === "creation" ? creationRows : allRows;
    const pendingVisibleRows = visibleRows.filter((row) => row.can_mark_paid);

    const markSinglePaid = (commissionId) => {
        router.post(
            route("payroll.editor-commissions.mark-paid", commissionId),
            {},
            { preserveScroll: true },
        );
    };

    const markBatchPaid = () => {
        if (pendingVisibleRows.length === 0) return;

        router.post(
            route("payroll.editor-commissions.batch-mark-paid"),
            { commission_ids: pendingVisibleRows.map((row) => row.id) },
            { preserveScroll: true },
        );
    };

    const markEditorPaid = (editorId) => {
        const editorPendingIds = allRows
            .filter((row) => Number(row.editor_id) === Number(editorId) && row.can_mark_paid)
            .map((row) => row.id);

        if (editorPendingIds.length === 0) return;

        router.post(
            route("payroll.editor-commissions.batch-mark-paid"),
            { commission_ids: editorPendingIds },
            { preserveScroll: true },
        );
    };

    return (
        <MainLayout pageTitle="Editor Commissions">
            <Head title="Editor Commissions" />

            <div className="space-y-6">
                {/* ── Tab Navigation ──────────────────────────────────────────*/}
                <div className="flex items-center gap-4 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
                    <a
                        href={route("payroll.salaries.index")}
                        className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white whitespace-nowrap"
                    >
                        Salary Profiles
                    </a>
                    <a
                        href={route("payroll.editor-commissions.index")}
                        className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-primary-500 whitespace-nowrap"
                    >
                        Editor Commissions
                    </a>
                </div>

                <div className="space-y-8">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === "all"
                                ? "bg-primary-500 text-white"
                                : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200"
                        }`}
                    >
                        All Commissions ({allRows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("creation")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === "creation"
                                ? "bg-primary-500 text-white"
                                : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200"
                        }`}
                    >
                        Creation Charge ({creationRows.length})
                    </button>

                    <button
                        type="button"
                        onClick={markBatchPaid}
                        disabled={pendingVisibleRows.length === 0}
                        className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Accept Visible Pending
                    </button>
                </div>
                {/* ── Filter Bar ──────────────────────────────────────────*/}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <Filter className="w-5 h-5 text-primary-500" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Editor Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Editor
                            </label>
                            <select
                                value={selectedEditor}
                                onChange={(e) => setSelectedEditor(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">All Editors</option>
                                {editors.map((editor) => (
                                    <option key={editor.id} value={editor.id}>
                                        {editor.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Month */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Month
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                {monthOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Year
                            </label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                {yearOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>

                        {/* Apply Button */}
                        <div className="flex items-end">
                            <button
                                onClick={handleApplyFilters}
                                className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Apply
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Summary Cards (per editor) ──────────────────────────*/}
                {summary.length > 0 ? (
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            Summary by Editor
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {summary.map((card) => (
                                <div
                                    key={card.editor_id}
                                    className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm"
                                >
                                    {/* Editor Name */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            {card.editor_name}
                                        </h4>
                                        <TrendingUp className="w-4 h-4 text-primary-500" />
                                    </div>

                                    {/* Stats Rows */}
                                    <div className="space-y-3 text-xs">
                                        {/* Jobs Count */}
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Jobs:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {card.jobs_count}
                                            </span>
                                        </div>

                                        {/* Total Bill Value */}
                                        <div className="flex justify-between border-t border-gray-100 dark:border-slate-700 pt-2">
                                            <span className="text-gray-600 dark:text-gray-400">Bill Total:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {fmtMoney(card.total_bill_value)}
                                            </span>
                                        </div>

                                        {/* Commissionable Total */}
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Commissionable:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {fmtMoney(card.commissionable_total)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Creation Charge:</span>
                                            <span className="font-bold text-violet-600 dark:text-violet-400">
                                                {fmtMoney(card.creation_charge_total)}
                                            </span>
                                        </div>

                                        {/* Commission Earned */}
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Earned:</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {fmtMoney(card.commission_earned)}
                                            </span>
                                        </div>

                                        {/* Commission Paid */}
                                        <div className="flex justify-between border-t border-gray-100 dark:border-slate-700 pt-2">
                                            <span className="text-gray-600 dark:text-gray-400">Paid:</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">
                                                {fmtMoney(card.commission_paid)}
                                            </span>
                                        </div>

                                        {/* Commission Pending */}
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">
                                                {fmtMoney(card.commission_pending)}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => markEditorPaid(card.editor_id)}
                                            disabled={Number(card.commission_pending) <= 0}
                                            className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 disabled:cursor-not-allowed dark:bg-emerald-900/30 dark:text-emerald-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                                        >
                                            {Number(card.commission_pending) <= 0
                                                ? "No Pending to Accept"
                                                : "Accept This Editor Pending"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">No commissions found for the selected filters.</p>
                    </div>
                )}

                {/* ── Commission Records Table ────────────────────────────*/}
                {visibleRows.length > 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Bill No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Editor</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Job Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Bill Total</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Commissionable</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Creation Charge</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">%</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Commission</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {visibleRows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{row.date}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{row.bill_no}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{row.editor_name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">{row.job_description}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium text-right">{fmtMoney(row.bill_total)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium text-right">{fmtMoney(row.commissionable_amt)}</td>
                                            <td className="px-6 py-4 text-sm text-violet-600 dark:text-violet-400 font-bold text-right">{fmtMoney(row.creation_charge_amt)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium text-right">{row.commission_pct}%</td>
                                            <td className="px-6 py-4 text-sm text-emerald-600 dark:text-emerald-400 font-bold text-right">{fmtMoney(row.commission_amt)}</td>
                                            <td className="px-6 py-4 text-sm">
                                                {row.in_payroll ? (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                        <span className="text-xs font-bold">In Payroll</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-bold">Pending</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {row.can_mark_paid ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => markSinglePaid(row.id)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                    >
                                                        Accept
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {commissions.last_page > 1 && (
                            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Showing <span className="font-bold">{(commissions.current_page - 1) * commissions.per_page + 1}</span> to{" "}
                                    <span className="font-bold">
                                        {Math.min(commissions.current_page * commissions.per_page, commissions.total)}
                                    </span>{" "}
                                    of <span className="font-bold">{commissions.total}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            router.get(route("payroll.editor-commissions.index"), {
                                                ...filters,
                                                page: commissions.current_page - 1,
                                            })
                                        }
                                        disabled={commissions.current_page === 1}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        Page {commissions.current_page}
                                    </span>
                                    <button
                                        onClick={() =>
                                            router.get(route("payroll.editor-commissions.index"), {
                                                ...filters,
                                                page: commissions.current_page + 1,
                                            })
                                        }
                                        disabled={commissions.current_page === commissions.last_page}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

                </div>
            </div>
        </MainLayout>
    );
}
