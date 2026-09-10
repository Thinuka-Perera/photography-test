import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertCircle,
    CheckCircle,
    DollarSign,
    FileText,
    Plus,
    Search,
    Trash2,
    Undo,
    User,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

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

// ── Create Return Modal ──────────────────────────────────────────────────────

function CreateReturnModal({ onClose }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [returnItems, setReturnItems] = useState({}); // maps product_id to return quantity
    const [customError, setCustomError] = useState("");

    const { data, setData, post, processing, errors } = useForm({
        transaction_type: "",
        transaction_id: "",
        reason: "",
        items: [],
    });

    // Handle AJAX search for invoices and bills
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await fetch(
                    route("finance.returns.search-transaction") + `?query=${encodeURIComponent(searchQuery)}`
                );
                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(data);
                }
            } catch (err) {
                console.error("Failed to fetch transactions", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const handleSelectTx = (tx) => {
        setSelectedTx(tx);
        setSearchQuery("");
        setSearchResults([]);
        setReturnItems({});
        setCustomError("");

        const type = tx.id.startsWith("sale_") ? "sale" : "invoice";
        setData((prev) => ({
            ...prev,
            transaction_type: type,
            transaction_id: type === "sale" ? tx.sale_id : tx.invoice_id,
            items: [],
        }));
    };

    const handleQtyChange = (itemId, maxQty, val) => {
        const intVal = parseInt(val) || 0;
        if (intVal < 0) return;
        if (intVal > maxQty) {
            setCustomError(`Cannot exceed refundable quantity of ${maxQty}`);
            return;
        } else {
            setCustomError("");
        }

        setReturnItems((prev) => ({
            ...prev,
            [itemId]: intVal,
        }));
    };

    // Calculate total return sum
    const totalReturnAmount = selectedTx
        ? selectedTx.items.reduce((sum, item) => {
            const qty = returnItems[item.product_id] || 0;
            return sum + qty * item.unit_price;
        }, 0)
        : 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        setCustomError("");

        if (!selectedTx) {
            setCustomError("Please select a transaction first.");
            return;
        }

        const itemsToSubmit = selectedTx.items
            .filter((item) => (returnItems[item.product_id] || 0) > 0)
            .map((item) => ({
                product_id: item.product_id,
                quantity: returnItems[item.product_id],
                unit_price: item.unit_price,
            }));

        if (itemsToSubmit.length === 0) {
            setCustomError("Please specify a quantity of at least 1 returned item.");
            return;
        }

        if (!data.reason.trim()) {
            setCustomError("Reason for return is required.");
            return;
        }

        // Set form items and submit
        router.post(route("finance.returns.store"), {
            transaction_type: data.transaction_type,
            transaction_id: data.transaction_id,
            reason: data.reason,
            items: itemsToSubmit,
        }, {
            onSuccess: () => onClose(),
            onError: (errs) => {
                if (errs.error) {
                    setCustomError(errs.error);
                }
            }
        });
    };

    const inputCls =
        "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-400";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Undo className="w-5 h-5 text-primary-500" /> Reset & Record Product Return
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: Find Transaction */}
                    {!selectedTx ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Search Invoice / Bill Number or Customer
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Type bill/invoice #, customer name, customer phone..."
                                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                            Searching...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-gray-50 dark:divide-slate-700 bg-gray-50 dark:bg-slate-900/50">
                                    {searchResults.map((tx) => (
                                        <button
                                            key={tx.id}
                                            type="button"
                                            onClick={() => handleSelectTx(tx)}
                                            className="w-full px-4 py-3 text-left hover:bg-primary-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                                        >
                                            <div>
                                                <span className="font-semibold text-primary-500 text-sm block">
                                                    {tx.number}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                                    Customer: {tx.customer_name} ({tx.customer_phone || "No phone"}) | Date: {fmtDate(tx.date)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                                                    {fmt(tx.total_amount)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 uppercase">
                                                    {tx.id.startsWith("sale_") ? "POS Bill" : "Invoice"}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                                <p className="text-xs text-gray-400 text-center py-4">No matching transactions found.</p>
                            )}
                        </div>
                    ) : (
                        /* Step 2: Configure Return */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Selected Transaction Summary */}
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-150 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold">Selected Transaction</p>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                        {selectedTx.number} ({selectedTx.id.startsWith("sale_") ? "POS Bill" : "Invoice"})
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Customer: {selectedTx.customer_name} | Date: {fmtDate(selectedTx.date)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTx(null)}
                                    className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
                                >
                                    Change
                                </button>
                            </div>

                            {/* Return Items Configuration */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                                    Configure Returned Items
                                </label>
                                <div className="border border-gray-150 dark:border-slate-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-50 dark:bg-slate-900/40 text-gray-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3">Product Name / Description</th>
                                                <th className="px-4 py-3 text-center">Purchased</th>
                                                <th className="px-4 py-3 text-center">Returned</th>
                                                <th className="px-4 py-3 text-center">Remaining</th>
                                                <th className="px-4 py-3 text-right">Price</th>
                                                <th className="px-4 py-3 text-center w-24">Return Qt.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700 font-medium">
                                            {selectedTx.items.map((item) => {
                                                const maxQty = item.refundable_quantity;
                                                const currentReturnVal = returnItems[item.product_id] || "";

                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                            <div className="font-semibold">{item.product_name}</div>
                                                            {item.product_sku && (
                                                                <div className="text-[10px] text-gray-400 mt-0.5 font-normal">
                                                                    SKU: {item.product_sku}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-350">
                                                            {item.original_quantity}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-350">
                                                            {item.already_returned}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-red-500 font-semibold">
                                                            {maxQty}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                                                            {fmt(item.unit_price)}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={maxQty}
                                                                disabled={maxQty === 0}
                                                                value={currentReturnVal}
                                                                onChange={(e) =>
                                                                    handleQtyChange(item.product_id, maxQty, e.target.value)
                                                                }
                                                                placeholder="0"
                                                                className="w-full text-center px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Reason for Return */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Reason for Return *
                                </label>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData("reason", e.target.value)}
                                    rows={2}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Explain why this products are being returned (required)..."
                                />
                                {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
                            </div>

                            {/* Error notification */}
                            {customError && (
                                <div className="flex items-center gap-2 text-xs text-red-650 bg-red-50 dark:bg-red-950/20 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                                    <span>{customError}</span>
                                </div>
                            )}

                            {/* Total Return Amount Panel */}
                            <div className="bg-gray-50 dark:bg-slate-900/35 rounded-xl p-4 flex justify-between items-center text-sm">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Total Return Refund Amount:</span>
                                <span className="text-lg font-bold text-primary-500">{fmt(totalReturnAmount)}</span>
                            </div>

                            {/* Submission button */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-650 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || totalReturnAmount === 0}
                                    className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
                                >
                                    {processing ? "Processing Return..." : "Record & Restock Return"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Returns Page ────────────────────────────────────────────────────────

export default function Returns({ returns, filters }) {
    const { flash, auth } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState(filters?.search ?? "");
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [confirmDeleteReturn, setConfirmDeleteReturn] = useState(null);
    const [localToast, setLocalToast] = useState(null);

    const canDelete = auth?.access?.is_super_admin || auth?.access?.page_lookup?.['returns.delete'] || auth?.access?.page_lookup?.['returns'];

    const applyFilters = () => {
        router.get(
            route("finance.returns.index"),
            { search },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        setSearch("");
        router.get(route("finance.returns.index"));
    };

    const handleDeleteSubmit = (ret) => {
        router.delete(route('finance.returns.destroy', ret.id), {
            onSuccess: () => {
                setConfirmDeleteReturn(null);
                setLocalToast({ message: `Return ${ret.return_number} deleted successfully!` });
                setTimeout(() => {
                    setLocalToast(null);
                }, 1000);
            },
            onError: (err) => {
                setConfirmDeleteReturn(null);
                setLocalToast({ message: "Failed to delete return.", type: "error" });
                setTimeout(() => {
                    setLocalToast(null);
                }, 1500);
            }
        });
    };

    return (
        <MainLayout pageTitle="Returns">
            <Head title="Returns" />

            {localToast && (
                <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-white shadow-xl text-sm font-semibold border ${localToast.type === 'error' ? 'bg-red-550 border-red-650' : 'bg-emerald-500 border-emerald-600'
                        }`}>
                        {localToast.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                        <span>{localToast.message}</span>
                    </div>
                </div>
            )}

            {confirmDeleteReturn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md p-6 border border-gray-150 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-2xl">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-905 dark:text-white">Delete Return Transaction</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    Are you sure you want to delete return <strong>{confirmDeleteReturn.return_number}</strong>?
                                </p>
                                <p className="text-xs text-red-500 mt-2 font-medium bg-red-50 dark:bg-red-950/15 p-2.5 rounded-xl border border-red-100 dark:border-red-950/30">
                                    Warning: This will deduct the returned quantities from stock inventory!
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setConfirmDeleteReturn(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-250 dark:border-slate-650 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-750 transition text-gray-600 dark:text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteSubmit(confirmDeleteReturn)}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-xl text-sm font-semibold transition"
                            >
                                Delete Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && <CreateReturnModal onClose={() => setShowModal(false)} />}

            {/* View Return Detail Drawer/Modal */}
            {selectedReturn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                Return Transaction Detail — {selectedReturn.return_number}
                            </h3>
                            <button
                                onClick={() => setSelectedReturn(null)}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-gray-400 block">Customer</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {selectedReturn.customer_name} ({selectedReturn.customer_phone || "No phone"})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">Returned On</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {fmtDate(selectedReturn.created_at)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">Original Transaction Type</span>
                                    <span className="font-semibold text-gray-900 dark:text-white uppercase">
                                        {selectedReturn.sale_id ? "POS Bill" : "Invoice"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">Processor</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {selectedReturn.processed_by?.name || "System"}
                                    </span>
                                </div>
                            </div>

                            <div className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden mt-4">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 dark:bg-slate-900/40 text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-2.5">Item</th>
                                            <th className="px-4 py-2.5 text-center">Returned Qty</th>
                                            <th className="px-4 py-2.5 text-right">Price</th>
                                            <th className="px-4 py-2.5 text-right">Refund Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700 font-medium">
                                        {selectedReturn.items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                    <div>{item.product_name}</div>
                                                    {item.product_sku && (
                                                        <div className="text-[10px] text-gray-400 mt-0.5">SKU: {item.product_sku}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                                                    {fmt(item.unit_price)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-primary-500">
                                                    {fmt(item.line_total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-slate-900/40 border border-gray-150 dark:border-slate-700 rounded-xl mt-4">
                                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Reason for Return</span>
                                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">{selectedReturn.reason}</p>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setSelectedReturn(null)}
                                    className="px-5 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Returns</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Track returned products, manage customer refund credits, and restore variant inventories automatically.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors inline-flex items-center gap-2 text-sm font-semibold shadow-sm animate-pulse-slow"
                    >
                        <Plus className="w-4 h-4" /> Record Product Return
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
                    <div className="flex gap-3">
                        <div className="flex-1 min-w-48 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                placeholder="Search by return number or customer info..."
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={applyFilters}
                            className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                        >
                            Search
                        </button>
                        {search && (
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-700/40 text-gray-400">
                                <tr>
                                    {["Return No", "Customer", "Reason", "Refund amount", "Processed by", "Returned Date", ""].map((h) => (
                                        <th
                                            key={h}
                                            className="px-5 py-4 text-xs font-semibold uppercase tracking-wide"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50 font-medium">
                                {returns.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center">
                                            <Undo className="w-12 h-12 text-gray-200 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="text-sm text-gray-450">No product returns matching search filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    returns.data.map((ret) => (
                                        <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors text-sm">
                                            <td className="px-5 py-4 font-semibold text-primary-500">
                                                {ret.return_number}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="text-gray-900 dark:text-white">{ret.customer_name}</p>
                                                {ret.customer_phone && <p className="text-xs text-gray-400">{ret.customer_phone}</p>}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                {ret.reason}
                                            </td>
                                            <td className="px-5 py-4 text-red-500 font-bold">
                                                {fmt(ret.total_amount)}
                                            </td>
                                            <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                                                {ret.processed_by ? (
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{ret.processed_by.name}</span>
                                                    </div>
                                                ) : (
                                                    "System"
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-gray-550">
                                                {fmtDate(ret.created_at)}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedReturn(ret)}
                                                        className="px-3 py-1.5 text-xs bg-gray-55 hover:bg-gray-100 border border-gray-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 rounded-lg"
                                                    >
                                                        View Details
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => setConfirmDeleteReturn(ret)}
                                                            className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 transition-colors"
                                                            title="Delete Return"
                                                        >
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

                    {returns.last_page > 1 && (
                        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-xs text-gray-400">
                                Showing {returns.from}–{returns.to} of {returns.total}
                            </p>
                            <div className="flex gap-1">
                                {returns.links.map((link) => (
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
