import MainLayout from "@/Layouts/MainLayout";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    FileText,
    Printer,
    RotateCcw,
    User,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { generateProfessionalPDF, sharePDFOnWhatsApp } from "@/utils/pdfGenerator";

const formatMoney = (val) =>
    "LKR " + Number(val ?? 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (val) => {
    if (!val) return null;
    try { return new Date(val).toLocaleDateString("en-LK", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return String(val).split("T")[0]; }
};

const STATUS_CONFIG = {
    draft:            { label: "Draft",            color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
    sent:             { label: "Sent",             color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    awaiting_payment: { label: "Awaiting Payment", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    paid:             { label: "Paid",             color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    partially_paid:   { label: "Partially Paid",   color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
    refunded:         { label: "Refunded",         color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    cancelled:        { label: "Cancelled",        color: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
};

// ── Toast — MUST remain uncommented ───────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, []);
    return (
        <div
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white"
            style={{ background: type === "success" ? "#10b981" : "#ef4444" }}
        >
            {type === "success" ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
    );
}

// ── Refund Panel ───────────────────────────────────────────────────────────
function RefundPanel({ invoice }) {
    const [open, setOpen]               = useState(false);
    const [processing, setProc]         = useState(false);
    const [amountStr, setAmountStr]     = useState("");
    const [reason, setReason]           = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const totalRefunded = (invoice.refunds ?? [])
        .filter((r) => r.status === "completed")
        .reduce((s, r) => s + parseFloat(r.amount), 0);

    const maxRefundable = Math.max(
        0, Math.round((parseFloat(invoice.total_amount) - totalRefunded) * 100) / 100
    );

    const canRefund = maxRefundable > 0 &&
        ["paid", "partially_paid", "sent", "awaiting_payment"].includes(invoice.status);

    const openPanel = () => { setAmountStr(maxRefundable.toFixed(2)); setReason(""); setFieldErrors({}); setOpen(true); };

    const handleAmountBlur = () => {
        const num = parseFloat(amountStr);
        if (isNaN(num) || num <= 0) { setFieldErrors((p) => ({ ...p, amount: "Enter a valid amount." })); }
        else if (num > maxRefundable) { setFieldErrors((p) => ({ ...p, amount: `Cannot exceed ${formatMoney(maxRefundable)}.` })); setAmountStr(maxRefundable.toFixed(2)); }
        else { setAmountStr(num.toFixed(2)); setFieldErrors((p) => ({ ...p, amount: "" })); }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFieldErrors({});
        const num = parseFloat(amountStr);
        if (isNaN(num) || num <= 0) { setFieldErrors({ amount: "Enter a valid amount." }); return; }
        if (num > maxRefundable)    { setFieldErrors({ amount: `Cannot exceed ${formatMoney(maxRefundable)}.` }); return; }
        if (!reason.trim())         { setFieldErrors({ reason: "Reason is required." }); return; }
        setProc(true);
        router.post(route("finance.invoices.refund", invoice.id), { amount: num, reason: reason.trim() }, {
            onSuccess: () => { setOpen(false); setAmountStr(""); setReason(""); },
            onError: (errs) => { setFieldErrors({ refund: errs.refund ?? errs.amount ?? errs.reason ?? "Refund failed.", amount: errs.amount ?? "", reason: errs.reason ?? "" }); },
            onFinish: () => setProc(false),
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-4">Refund History</h3>
            {(invoice.refunds ?? []).length > 0 ? (
                <div className="mb-4">
                    {invoice.refunds.map((r) => (
                        <div key={r.id} className="flex justify-between items-start py-2.5 border-b border-gray-50 dark:border-slate-700 last:border-0">
                            <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">{r.type} Refund</p>
                                <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>
                                {r.processed_by && <p className="text-xs text-gray-400 mt-0.5">By: {r.processed_by.name}</p>}
                            </div>
                            <span className="text-sm font-semibold text-red-500 flex-shrink-0 ml-4">− {formatMoney(r.amount)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-100 dark:border-slate-700 mt-1">
                        <span>Total Refunded</span><span className="text-red-500">{formatMoney(totalRefunded)}</span>
                    </div>
                </div>
            ) : <p className="text-xs text-gray-400 mb-4">No refunds yet.</p>}

            {invoice.status === "refunded" && (
                <div className="text-center text-xs text-gray-400 py-2 bg-gray-50 dark:bg-slate-700/40 rounded-xl">Invoice fully refunded</div>
            )}

            {canRefund && !open && (
                <button onClick={openPanel}
                    className="w-full py-2.5 border border-red-200 dark:border-red-800 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Issue Refund
                </button>
            )}

            {canRefund && open && (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Refund Amount *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none font-medium">LKR</span>
                            <input type="number" value={amountStr}
                                onChange={(e) => { setAmountStr(e.target.value); setFieldErrors((p) => ({ ...p, amount: "" })); }}
                                onBlur={handleAmountBlur} onWheel={(e) => e.target.blur()}
                                min="0.01" max={maxRefundable} step="0.01"
                                className="w-full pl-12 pr-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-300" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Max: <span className="font-medium">{formatMoney(maxRefundable)}</span></p>
                        {fieldErrors.amount && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.amount}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Reason *</label>
                        <textarea value={reason} onChange={(e) => { setReason(e.target.value); setFieldErrors((p) => ({ ...p, reason: "" })); }}
                            rows={3} placeholder="Reason for refund…"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                        {fieldErrors.reason && <p className="text-xs text-red-500 mt-1">{fieldErrors.reason}</p>}
                    </div>
                    {fieldErrors.refund && (
                        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.refund}</p>
                        </div>
                    )}
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => setOpen(false)} disabled={processing}
                            className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
                            {processing ? "Processing…" : "Confirm Refund"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function InvoiceShow({ invoice, shopSettings = {} }) {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null); // ✅ required — Toast uses this
    const [printOpen, setPrintOpen] = useState(false);

    useEffect(() => {
        if (flash?.message) setToast({ msg: flash.message, type: flash.success ? "success" : "error" });
        if (flash?.error)   setToast({ msg: flash.error,   type: "error" });
    }, [flash]);

    const handleWhatsAppShare = async () => {
        const doc = await generateProfessionalPDF({
            type: 'INVOICE',
            number: invoice.invoice_number,
            date: fmtDate(invoice.created_at),
            dueDate: fmtDate(invoice.due_date),
            customerName: invoice.customer_name,
            customerPhone: invoice.customer_phone,
            handledBy: invoice.employee?.name,
            items: invoice.items,
            subtotal: invoice.subtotal,
            discount: invoice.discount_amount,
            taxRate: invoice.tax_rate,
            taxAmount: invoice.tax_amount,
            total: invoice.total_amount,
            notes: invoice.notes,
            shopSettings: {
                ...shopSettings,
                name: shopSettings.shop_name,
                address: shopSettings.shop_address,
                phone: shopSettings.shop_phone,
                email: shopSettings.shop_email,
                logoUrl: shopSettings.shop_logo_url,
                paymentInfo: shopSettings.invoice_payment_info,
                termsConditions: shopSettings.invoice_terms,
                invoiceNote: shopSettings.invoice_note,
            }
        });

        const { generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
        const filename = `Invoice_${invoice.invoice_number}.pdf`;
        const message = generateWhatsAppMessageForBill(invoice, shopSettings);
        
        await sharePDFOnWhatsApp(doc, filename, invoice.customer_phone, message);
    };

    const totalsRows = [
        { label: "Subtotal", value: invoice.subtotal },
        ...(parseFloat(invoice.discount_amount) > 0 ? [{ label: "Discount", value: `-${invoice.discount_amount}` }] : []),
        ...(parseFloat(invoice.tax_amount) > 0 ? [{ label: `Tax (${invoice.tax_rate}%)`, value: invoice.tax_amount }] : []),
    ];

    const status = STATUS_CONFIG[invoice.status] ?? { label: invoice.status, color: "bg-gray-100 text-gray-600" };

    return (
        <MainLayout pageTitle="Invoice Detail">
            <Head title={`Invoice ${invoice.invoice_number}`} />

            {/* ✅ Toast component is defined above — renders correctly */}
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="max-w-4xl mx-auto space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <Link href={route("finance.invoices.index")}
                            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors mb-3">
                            <ArrowLeft className="w-4 h-4" /> Back to Invoices
                        </Link>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{invoice.invoice_number}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                            Created by {invoice.created_by?.name ?? "—"} · {fmtDate(invoice.created_at)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Print button — opens print page in new tab */}
                        <button
    onClick={() => setPrintOpen(true)}
    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
               bg-white dark:bg-slate-800 
               border border-gray-200 dark:border-slate-700
               text-gray-800 dark:text-white
               shadow-sm hover:shadow-md
               transition-all"
>
    <Printer className="w-4 h-4 text-primary-500" />
    Print / PDF
</button>
                        <button
                            onClick={handleWhatsAppShare}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
                                       bg-emerald-500 hover:bg-emerald-600
                                       text-white font-semibold
                                       shadow-md hover:shadow-lg
                                       transition-all"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            Share on WhatsApp
                        </button>
                        <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                            <FileText className="w-6 h-6 text-primary-500" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2 space-y-4">
                        {/* Handled By */}
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                <User className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Handled By</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{invoice.employee?.name ?? "—"}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Employee responsible for this customer's work</p>
                            </div>
                        </div>

                        {/* Customer */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-3">Customer</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><p className="text-xs text-gray-400 mb-0.5">Name</p><p className="font-medium text-gray-900 dark:text-white">{invoice.customer_name}</p></div>
                                {invoice.customer_phone && <div><p className="text-xs text-gray-400 mb-0.5">Phone</p><p className="font-medium text-gray-900 dark:text-white">{invoice.customer_phone}</p></div>}
                                {invoice.module && <div><p className="text-xs text-gray-400 mb-0.5">Module</p><p className="font-medium text-gray-900 dark:text-white capitalize">{invoice.module}</p></div>}
                                {invoice.due_date && <div><p className="text-xs text-gray-400 mb-0.5">Due Date</p><p className="font-medium text-gray-900 dark:text-white">{fmtDate(invoice.due_date)}</p></div>}
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-4">Items</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-slate-700">
                                        <th className="pb-3 font-medium">Description</th>
                                        <th className="pb-3 font-medium text-center">Qty</th>
                                        <th className="pb-3 font-medium text-right">Unit Price</th>
                                        <th className="pb-3 font-medium text-right">Disc</th>
                                        <th className="pb-3 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700/50">
                                            <td className="py-3">
                                                <p className="font-medium text-gray-800 dark:text-white">
                                                    {item.description}
                                                    {item.returned_quantity > 0 && (
                                                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                            Returned (Qty: {item.returned_quantity})
                                                        </span>
                                                    )}
                                                </p>
                                                {item.product_sku && <p className="text-xs text-gray-400">{item.product_sku}</p>}
                                            </td>
                                            <td className="py-3 text-center text-gray-600 dark:text-gray-300">{item.quantity}</td>
                                            <td className="py-3 text-right text-gray-600 dark:text-gray-300">{formatMoney(item.unit_price)}</td>
                                            <td className="py-3 text-right text-xs text-gray-400">{parseFloat(item.discount_pct) > 0 ? `${item.discount_pct}%` : "—"}</td>
                                            <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">{formatMoney(item.line_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-1.5">
                                {totalsRows.map((row) => (
                                    <div key={row.label} className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span>{row.label}</span><span>{formatMoney(row.value)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-slate-700">
                                    <span>Total</span><span className="text-primary-500">{formatMoney(invoice.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {invoice.notes && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Notes</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{invoice.notes}</p>
                            </div>
                        )}
                    </div>

                    <div><RefundPanel invoice={invoice} /></div>
                </div>
            </div>


        {printOpen && (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">

        <div className="bg-white dark:bg-slate-800 w-[95%] h-[90%] rounded-2xl overflow-hidden flex flex-col">

            {/* HEADER */}
            <div className="flex items-center justify-between p-3 border-b dark:border-slate-700">
                <h2 className="font-semibold">Print Preview</h2>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.frames["printFrame"].print()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                    >
                        Print
                    </button>

                    <button
                        onClick={() => setPrintOpen(false)}
                        className="px-4 py-2 border rounded-lg text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* IFRAME */}
            <iframe
                name="printFrame"
                src={`/finance/invoices/${invoice.id}/print`}
                className="w-full h-full"
            />
        </div>

    </div>
)}


        </MainLayout>
    );
}