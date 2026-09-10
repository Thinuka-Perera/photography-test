// ─────────────────────────────────────────────────────────────────────────────
// ConvertToInvoiceButton.jsx
//
// Drop this into the quotation list/table to allow converting quotations
// to invoices directly from the quotations page.
//
// USAGE in Photography/Quotations/Index.jsx:
//   import ConvertToInvoiceButton from "@/Components/Finance/ConvertToInvoiceButton";
//   ...
//   <ConvertToInvoiceButton quotation={quotation} employees={employees} />
//
// The employees list must be passed from QuotationController:
//   In QuotationController::index(), add:
//   'employees' => \App\Models\User::select('id', 'name')->orderBy('name')->get(),
// ─────────────────────────────────────────────────────────────────────────────

import { useForm } from "@inertiajs/react";
import { FileText, X } from "lucide-react";
import { useState } from "react";

export default function ConvertToInvoiceButton({ quotation }) {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        tax_rate: "0",
    });

    const handleConvert = (e) => {
        e.preventDefault();
        post(route("photography.quotations.convert-to-invoice", quotation.id), {
            onSuccess: () => { reset(); setOpen(false); },
        });
    };

    // Only show button for non-rejected, non-converted quotations
    const canConvert = quotation.status !== "rejected" && quotation.status !== "converted" && quotation.status !== "invoiced" && quotation.status !== "accepted";

    if (!canConvert) return null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                title="Convert to Invoice"
            >
                <FileText className="w-3.5 h-3.5" />
                To Invoice
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Convert to Invoice</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {quotation.quote_number} · {quotation.customer_name}
                                </p>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleConvert} className="space-y-4">
                            {/* Summary */}
                            <div className="bg-gray-50 dark:bg-slate-700/40 rounded-xl p-3 text-sm">
                                <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-1">
                                    <span>Package</span>
                                    <span className="font-medium">{quotation.package_name ?? "—"}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-1">
                                    <span>Event Type</span>
                                    <span className="font-medium">{quotation.event_type}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-slate-600">
                                    <span>Total</span>
                                    <span>LKR {Number(quotation.total_amount ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Tax Rate */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    value={data.tax_rate}
                                    onChange={e => setData("tax_rate", e.target.value)}
                                    min="0" max="100" step="0.01" placeholder="0"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                                />
                            </div>

                            {errors.invoice && (
                                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                                    {errors.invoice}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing}
                                    className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50">
                                    {processing ? "Converting…" : "Create Invoice"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}