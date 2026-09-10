import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertCircle,
    CheckCircle,
    DollarSign,
    Eye,
    FileText,
    Pencil,
    Plus,
    Search,
    Send,
    Trash2,
    User,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (val) =>
    "LKR " + Number(val ?? 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const fmtShort = (val) => {
    const n = Number(val ?? 0);
    if (n >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `LKR ${(n / 1_000).toFixed(1)}K`;
    return fmt(n);
};

const fmtDate = (val) => {
    if (!val) return null;
    try {
        return new Date(val).toLocaleDateString("en-LK", {
            year: "numeric", month: "short", day: "numeric",
        });
    } catch {
        return String(val).split("T")[0];
    }
};

const STATUS_CFG = {
    draft: { label: "Draft", cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
    sent: { label: "Sent", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    awaiting_payment: { label: "Awaiting", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    partially_paid: { label: "Part Paid", cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
    refunded: { label: "Refunded", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
};

const MODULE_CFG = {
    photography: { label: "Photography", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
    studio: { label: "Studio", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
    general: { label: "General", cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
};

// ── Toast ──────────────────────────────────────────────────────────────────
// FIX: Was using regular string "..." with ${} interpolation (doesn't work).
// Now uses inline style for background — this always works.

// function Toast({ message, type = "success", onClose }) {
//     useEffect(() => {
//         const t = setTimeout(onClose, 4000);
//         return () => clearTimeout(t);
//     }, []);

//     const bg = type === "success" ? "#10b981" : "#ef4444";

//     return (
//         <div
//             className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white"
//             style={{ background: bg }}
//         >
//             {type === "success"
//                 ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
//                 : <AlertCircle className="w-5 h-5 flex-shrink-0" />
//             }
//             <span>{message}</span>
//             <button
//                 onClick={onClose}
//                 className="ml-2 opacity-70 hover:opacity-100 flex-shrink-0"
//             >
//                 <X className="w-4 h-4" />
//             </button>
//         </div>
//     );
// }

// ── Custom Confirm Modal ───────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = "Confirm", confirmCls = "bg-red-500 hover:bg-red-600 text-white" }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-1">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmCls}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Invoice Modal ──────────────────────────────────────────────────────────

function InvoiceModal({ onClose, employees, editInvoice = null, products = [] }) {
    const isEdit = Boolean(editInvoice);

    const { data, setData, post, put, processing, errors } = useForm({
        customer_name: editInvoice?.customer_name ?? "",
        customer_phone: editInvoice?.customer_phone ?? "",
        employee_id: editInvoice?.employee_id ?? "",
        module: editInvoice?.module ?? "photography",
        notes: editInvoice?.notes ?? "",
        due_date: editInvoice?.due_date ? String(editInvoice.due_date).split("T")[0] : "",
        status: editInvoice?.status ?? "draft",
        advance_payments: editInvoice?.advance_payments ?? [],
        items: editInvoice?.items?.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount_pct: i.discount_pct ?? 0,
            product_id: i.product_id ?? null,
            product_sku: i.product_sku ?? null,
        })) ?? [{ description: "", quantity: 1, unit_price: "", discount_pct: 0, product_id: null, product_sku: null }],
    });

    const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);

    const filteredProducts = useMemo(() => {
        if (activeDropdownIndex === null) return [];
        const searchVal = data.items[activeDropdownIndex]?.description?.toLowerCase() || "";
        return products.filter(p =>
            p.name.toLowerCase().includes(searchVal) ||
            p.sku.toLowerCase().includes(searchVal)
        );
    }, [products, data.items, activeDropdownIndex]);

    const addItem = () => setData("items", [...data.items, { description: "", quantity: 1, unit_price: "", discount_pct: 0, product_id: null, product_sku: null }]);
    const removeItem = (i) => setData("items", data.items.filter((_, idx) => idx !== i));
    const updateItem = (i, fieldOrMap, value) => {
        const items = [...data.items];
        if (typeof fieldOrMap === "object" && fieldOrMap !== null) {
            items[i] = { ...items[i], ...fieldOrMap };
        } else {
            items[i] = { ...items[i], [fieldOrMap]: value };
            if (fieldOrMap === "description") {
                const matchingProduct = products.find(p => p.name === value);
                if (!matchingProduct) {
                    items[i].product_id = null;
                    items[i].product_sku = null;
                } else {
                    items[i].product_id = matchingProduct.id;
                    items[i].product_sku = matchingProduct.sku;
                }
            }
        }
        setData("items", items);
    };

    const addAdvancePayment = () => setData("advance_payments", [...(data.advance_payments || []), { title: `Payment ${(data.advance_payments?.length || 0) + 1}`, amount: "" }]);
    const removeAdvancePayment = (i) => setData("advance_payments", data.advance_payments.filter((_, idx) => idx !== i));
    const updateAdvancePayment = (i, field, value) => {
        const paps = [...data.advance_payments];
        paps[i] = { ...paps[i], [field]: value };
        setData("advance_payments", paps);
    };

    const subtotal = data.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * (1 - (Number(it.discount_pct) || 0) / 100), 0);
    const total = subtotal;
    const totalAdvance = (data.advance_payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, total - totalAdvance);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) put(route("finance.invoices.update", editInvoice.id), { onSuccess: onClose });
        else post(route("finance.invoices.store"), { onSuccess: onClose });
    };

    const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-400";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {isEdit ? `Edit ${editInvoice.invoice_number}` : "Create New Invoice"}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Customer */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Customer Name *</label>
                            <input type="text" value={data.customer_name} onChange={(e) => setData("customer_name", e.target.value)} className={inputCls} placeholder="Customer name" />
                            {errors.customer_name && <p className="text-xs text-red-500 mt-1">{errors.customer_name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Phone</label>
                            <input type="text" value={data.customer_phone} onChange={(e) => setData("customer_phone", e.target.value)} className={inputCls} placeholder="0771234567" />
                        </div>
                    </div>

                    {/* Handled By */}
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                        <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5 uppercase tracking-wide">
                            Handled By (Employee)
                        </label>
                        <select value={data.employee_id} onChange={(e) => setData("employee_id", e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                            <option value="">— Select employee —</option>
                            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">This employee appears as "Handled By" on the invoice.</p>
                    </div>

                    {/* Module + Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Module</label>
                            <select value={data.module} onChange={(e) => setData("module", e.target.value)} className={inputCls}>
                                <option value="photography">Photography</option>
                                <option value="studio">Studio</option>
                                <option value="general">General</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Due Date</label>
                            <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* Status (edit only) */}
                    {isEdit && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Status</label>
                            <select value={data.status} onChange={(e) => setData("status", e.target.value)} className={inputCls}>
                                {Object.entries(STATUS_CFG)
                                    .filter(([val]) => val !== "refunded")
                                    .map(([val, cfg]) => (
                                        <option key={val} value={val}>{cfg.label}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Line Items *</label>
                            <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium">
                                <Plus className="w-3.5 h-3.5" /> Add item
                            </button>
                        </div>
                        <div className="grid grid-cols-12 gap-2 mb-1">
                            {[["Description", "col-span-5"], ["Qty", "col-span-2"], ["Unit Price", "col-span-3"], ["Disc%", "col-span-1"], ["", "col-span-1"]].map(([h, c]) => (
                                <div key={h} className={`${c} text-xs text-gray-400 uppercase`}>{h}</div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            {data.items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5 relative">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateItem(i, "description", e.target.value)}
                                            onFocus={() => setActiveDropdownIndex(i)}
                                            onBlur={() => setTimeout(() => setActiveDropdownIndex(null), 250)}
                                            placeholder="Description"
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white"
                                        />
                                        {activeDropdownIndex === i && filteredProducts.length > 0 && (
                                            <ul className="absolute z-[1000] w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mt-1 max-h-60 overflow-y-auto shadow-xl">
                                                {filteredProducts.map((product) => (
                                                    <li
                                                        key={`item-${i}-prod-${product.id}`}
                                                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center text-xs border-b border-gray-100 dark:border-slate-700/60"
                                                        onMouseDown={() => {
                                                            updateItem(i, {
                                                                description: product.name,
                                                                product_id: product.id,
                                                                product_sku: product.sku,
                                                                unit_price: Number(product.price),
                                                            });
                                                        }}
                                                    >
                                                        <div>
                                                            <span className="font-semibold text-gray-900 dark:text-white block text-left">{product.name}</span>
                                                            <span className="text-gray-400 dark:text-gray-500 font-mono text-[10px] block text-left">{product.sku}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-semibold text-primary-500 block">LKR {Number(product.price || 0).toLocaleString("en-LK")}</span>
                                                            <span className={`text-[10px] font-medium ${product.stock > 0 ? "text-emerald-500" : "text-amber-500"}`}>
                                                                Stock: {product.stock}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {(() => {
                                            const matchedProduct = products.find((p) => p.id === item.product_id);
                                            if (!matchedProduct) return null;
                                            const exceeds = Number(item.quantity || 1) > Number(matchedProduct.stock);
                                            return (
                                                <div className="mt-1 flex items-center justify-between text-[10px] px-1">
                                                    <span className="text-gray-400 font-mono font-medium">SKU: {matchedProduct.sku}</span>
                                                    <span className={`font-semibold ${exceeds ? "text-amber-500 dark:text-amber-400 animate-pulse" : "text-emerald-500"}`}>
                                                        In Stock: {matchedProduct.stock} {exceeds && "(Warning: Exceeds Available Stock)"}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} min="1"
                                        className="col-span-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                                    <input type="number" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} min="0" step="0.01" placeholder="0.00"
                                        className="col-span-3 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                                    <input type="number" value={item.discount_pct} onChange={(e) => updateItem(i, "discount_pct", e.target.value)} min="0" max="100" placeholder="0"
                                        className="col-span-1 px-2 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                                    <div className="col-span-1 flex justify-center">
                                        {data.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(i)}>
                                                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {errors.items && <p className="text-xs text-red-500 mt-1">{errors.items}</p>}
                    </div>

                    {/* Advance Payments */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Advance Payments</label>
                            <button type="button" onClick={addAdvancePayment} className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium">
                                <Plus className="w-3.5 h-3.5" /> Add Payment Row
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(data.advance_payments || []).map((pay, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                    <input type="text" value={pay.title} onChange={(e) => updateAdvancePayment(i, "title", e.target.value)} placeholder="e.g. Advance 1"
                                        className="col-span-7 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                                    <input type="number" value={pay.amount} onChange={(e) => updateAdvancePayment(i, "amount", e.target.value)} min="0" step="0.01" placeholder="0.00"
                                        className="col-span-4 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                                    <div className="col-span-1 flex justify-center">
                                        <button type="button" onClick={() => removeAdvancePayment(i)}>
                                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Notes</label>
                        <textarea value={data.notes} onChange={(e) => setData("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Optional notes…" />
                    </div>

                    {/* Totals Preview */}
                    <div className="bg-gray-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-1.5 text-sm">
                        <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                        {totalAdvance > 0 && (
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Advance Paid</span><span>− {fmt(totalAdvance)}</span></div>
                        )}
                        <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-slate-600">
                            <span>Balance Due</span><span className="text-primary-500">{fmt(balanceDue)}</span>
                        </div>
                    </div>

                    {errors.invoice && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.invoice}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
                            {processing ? "Saving…" : isEdit ? "Update Invoice" : "Create Invoice"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Invoices Page ─────────────────────────────────────────────────────

export default function Invoices({ invoices, stats, employees, filters, products = [] }) {
    const { flash } = usePage().props;

    const [showModal, setShowModal] = useState(false);
    const [editInvoice, setEdit] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const [search, setSearch] = useState(filters?.search ?? "");
    const [statusF, setStatusF] = useState(filters?.status ?? "");
    const [moduleF, setModuleF] = useState(filters?.module ?? "");
    const [yearF, setYearF] = useState(filters?.year ?? "");
    const [monthF, setMonthF] = useState(filters?.month ?? "");
    const [startDate, setStartDate] = useState(filters?.start_date ?? "");
    const [endDate, setEndDate] = useState(filters?.end_date ?? "");



    const applyFilters = () => {
        router.get(route("finance.invoices.index"), {
            search,
            status: statusF,
            module: moduleF,
            year: yearF,
            month: monthF,
            start_date: startDate,
            end_date: endDate
        }, {
            preserveState: true, replace: true,
        });
    };

    const resetFilters = () => {
        setSearch(""); setStatusF(""); setModuleF("");
        setYearF(""); setMonthF(""); setStartDate(""); setEndDate("");
        router.get(route("finance.invoices.index"));
    };

    const handleDeleteConfirmed = () => {
        router.delete(route("finance.invoices.destroy", confirmDel.id), {
            onSuccess: () => setToast({ msg: `Invoice ${confirmDel.number} cancelled.`, type: "success" }),
        });
        setConfirmDel(null);
    };

    return (
        <MainLayout pageTitle="Invoices">
            <Head title="Invoices" />



            {confirmDel && (
                <ConfirmModal
                    title="Cancel Invoice"
                    message={`Cancel invoice ${confirmDel.number}? The status will be set to Cancelled.`}
                    confirmLabel="Yes, Cancel It"
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setConfirmDel(null)}
                />
            )}

            {(showModal || editInvoice) && (
                <InvoiceModal
                    employees={employees}
                    editInvoice={editInvoice}
                    products={products}
                    onClose={() => { setShowModal(false); setEdit(null); }}
                />
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Management</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Create, track, and manage invoices. Each invoice shows the employee who handled the work.
                        </p>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors inline-flex items-center gap-2 text-sm font-semibold shadow-sm">
                        <Plus className="w-4 h-4" /> New Invoice
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { icon: FileText, bg: "bg-blue-100 dark:bg-blue-900/30", ic: "text-blue-500", title: "Open Invoices", value: stats?.openInvoices ?? 0, sub: `Outstanding: ${fmtShort(stats?.outstandingAmount)}` },
                        { icon: DollarSign, bg: "bg-emerald-100 dark:bg-emerald-900/30", ic: "text-emerald-500", title: "This Month Revenue", value: fmtShort(stats?.monthRevenue), sub: `All-time: ${fmtShort(stats?.totalRevenue)}` },
                        { icon: Send, bg: "bg-violet-100 dark:bg-violet-900/30", ic: "text-violet-500", title: "Net Profit (Month)", value: fmtShort(stats?.netProfit), sub: `Refunds: ${fmtShort(stats?.monthRefunds)}` },
                    ].map((s) => (
                        <div key={s.title} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${s.bg}`}>
                                    <s.icon className={`w-5 h-5 ${s.ic}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.title}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-3">{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
                    <div className="flex gap-3 flex-wrap">
                        <div className="flex-1 min-w-48 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                placeholder="Search by invoice # or customer…"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                        </div>
                        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white">
                            <option value="">All Status</option>
                            {Object.entries(STATUS_CFG)
                                .filter(([v]) => v !== "refunded")
                                .map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                        </select>
                        <select value={moduleF} onChange={(e) => setModuleF(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white">
                            <option value="">All Modules</option>
                            {Object.entries(MODULE_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                        </select>

                        <select value={yearF} onChange={(e) => setYearF(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white">
                            <option value="">All Years</option>
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        <select value={monthF} onChange={(e) => setMonthF(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white">
                            <option value="">All Months</option>
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                            <span className="text-gray-400">to</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white" />
                        </div>
                        <button onClick={applyFilters}
                            className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors">
                            Filter
                        </button>
                        {(search || statusF || moduleF || yearF || monthF || startDate || endDate) && (
                            <button onClick={resetFilters}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700/40">
                                <tr>
                                    {["Invoice", "Customer", "Handled By", "Module", "Amount", "Status", ""].map((h) => (
                                        <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {invoices.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center">
                                            <FileText className="w-12 h-12 text-gray-200 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="text-sm text-gray-400">No invoices found</p>
                                            <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-primary-500 hover:underline">
                                                Create your first invoice →
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.data.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <span className="font-semibold text-primary-500 text-sm">{inv.invoice_number}</span>
                                                {inv.due_date && <p className="text-xs text-gray-400 mt-0.5">Due {fmtDate(inv.due_date)}</p>}
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.customer_name}</p>
                                                {inv.customer_phone && <p className="text-xs text-gray-400">{inv.customer_phone}</p>}
                                            </td>
                                            <td className="px-5 py-4">
                                                {inv.employee ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                                            <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">{inv.employee.name}</span>
                                                    </div>
                                                ) : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${MODULE_CFG[inv.module]?.cls ?? ""}`}>
                                                    {MODULE_CFG[inv.module]?.label ?? inv.module}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-sm text-gray-900 dark:text-white">{fmt(inv.total_amount)}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CFG[inv.status]?.cls ?? ""}`}>
                                                    {STATUS_CFG[inv.status]?.label ?? inv.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1">
                                                    <a href={route("finance.invoices.show", inv.id)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-primary-500 transition-colors" title="View">
                                                        <Eye className="w-4 h-4" />
                                                    </a>
                                                    {!["refunded", "cancelled"].includes(inv.status) && (
                                                        <button onClick={() => setEdit(inv)}
                                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-primary-500 transition-colors" title="Edit">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!["paid", "refunded", "cancelled"].includes(inv.status) && (
                                                        <button onClick={() => setConfirmDel({ id: inv.id, number: inv.invoice_number })}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title="Cancel">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {invoices.last_page > 1 && (
                        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-xs text-gray-400">
                                Showing {invoices.from}–{invoices.to} of {invoices.total}
                            </p>
                            <div className="flex gap-1">
                                {invoices.links.map((link) => (
                                    <button
                                        key={`${link.label}-${link.url ?? "x"}`}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${link.active
                                            ? "bg-primary-500 text-white"
                                            : link.url
                                                ? "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                                : "bg-gray-50 dark:bg-slate-800 text-gray-300 cursor-not-allowed"
                                            }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}