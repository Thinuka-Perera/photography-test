import React, { useState } from 'react';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ArrowLeft, Printer, FileText, Edit2, Trash2, AlertCircle, DollarSign } from 'lucide-react';
import BillPrintThermal from '@/Components/Bills/BillPrintThermal';

/**
 * Studio/Bills/Show.jsx
 * 
 * Display a single bill with:
 * - Full details (customer, items, totals)
 * - Print buttons (A4, Thermal)
 * - Edit/Delete actions
 * - Status change dropdown
 */
export default function BillShow({ bill, shopInfo, invoiceSettings }) {
    const { auth, shopSettings: pageShopSettings = {}, activeShop = null } = usePage().props;
    const [printMode, setPrintMode] = useState(null); // 'thermal' or null
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        amount: Number(bill.balance_due ?? 0).toFixed(2),
        payment_method: 'cash',
        reference_number: '',
        bank_name: '',
    });

    const handlePaySubmit = (e) => {
        e.preventDefault();
        post(route('studio.bills.payBalance', bill.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowPayModal(false);
                reset();
            },
        });
    };

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(val || 0);
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
            pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
            completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
            cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        };
        const labels = {
            draft: 'Draft',
            pending: 'Pending',
            completed: 'Completed',
            cancelled: 'Cancelled',
        };
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const creationCharge = Number(bill.creation_charge || 0);

    const handlePrint = (mode) => {
        setPrintMode(mode);
        if (mode === 'thermal') {
            // Delay to allow component to render, then trigger print
            setTimeout(() => {
                window.print();
            }, 100);
        }
    };

    if (printMode === 'thermal') {
        return <BillPrintThermal bill={bill} shopInfo={shopInfo} invoiceSettings={invoiceSettings} activeShop={activeShop} pageShopSettings={pageShopSettings} />;
    }

    // Normal view
    return (
        <MainLayout pageTitle={`Bill ${bill.bill_number}`}>
            <Head title={`Bill ${bill.bill_number}`} />

            {/* ──────────────────────────────────────────
                HEADER BAR
            ────────────────────────────────────────── */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Bill {bill.bill_number}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Created {formatDate(bill.created_at)}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <div>
                    {getStatusBadge(bill.status)}
                </div>
            </div>

            {/* ──────────────────────────────────────────
                ACTION BUTTONS (Print, Edit, Delete)
            ────────────────────────────────────────── */}
            <div className="mb-6 flex flex-wrap gap-3">
                <a
                    href={route('studio.bills.print', { bill: bill.id, type: 'a4' })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
                >
                    <Printer className="w-4 h-4" />
                    Print Invoice
                </a>

                <button
                    onClick={() => handlePrint('thermal')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition"
                >
                    <FileText className="w-4 h-4" />
                    Print Thermal
                </button>

                {bill.status === 'draft' && auth?.access?.is_super_admin && (
                    <Link
                        href={route('studio.bills.edit', bill.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </Link>
                )}

                {bill.status !== 'cancelled' && auth?.access?.is_super_admin && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                )}
            </div>

            {/* ──────────────────────────────────────────
                DELETE CONFIRMATION MODAL
            ────────────────────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Bill?</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    This action cannot be undone. The bill will be marked as cancelled.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    router.delete(route('studio.bills.destroy', bill.id));
                                }}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
                            >
                                Yes, Delete Bill
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────
                BILL DETAILS
            ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left Column — Customer Info */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4">Customer Info</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{bill.customer_name || 'Walk-in'}</p>
                        </div>
                        {bill.customer_phone && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{bill.customer_phone}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle Column — Bill Info */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4">Bill Info</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Bill Number</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{bill.bill_number}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatDate(bill.created_at)}</p>
                        </div>
                        {bill.payment_method && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Payment</p>
                                <p className="font-semibold text-gray-900 dark:text-white capitalize">{bill.payment_method}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                            <div className="mt-1">{getStatusBadge(bill.status)}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column — Assigned Editor */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4">Editor</h3>
                    {bill.editor ? (
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{bill.editor.name}</p>
                            </div>
                            {bill.commission_rate > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Commission Rate</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{bill.commission_rate.toFixed(2)}%</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Not assigned</p>
                    )}
                </div>
            </div>


            {/* ──────────────────────────────────────────
                LINE ITEMS TABLE
            ────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Line Items</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300">Description</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300">Qty</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300">Unit Price</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {bill.items?.length > 0 ? (
                                bill.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.category?.name || item.category_name || item.stock_item?.variant?.product?.category?.name || item.stockItem?.variant?.product?.category?.name || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {item.description}
                                            {item.returned_quantity > 0 && (
                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                    Returned (Qty: {item.returned_quantity})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-white">{item.quantity}</td>
                                        <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                                            {formatCurrency(item.unit_price)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(item.quantity * item.unit_price)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No items
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ──────────────────────────────────────────
                FINANCIAL SUMMARY
            ────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex justify-end">
                    <div className="w-96 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(bill.subtotal)}</span>
                        </div>

                        {bill.discount_amount > 0 && (
                            <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                                <span>Discount</span>
                                <span className="font-semibold">-{formatCurrency(bill.discount_amount)}</span>
                            </div>
                        )}

                        <div className="border-t border-b border-gray-200 dark:border-slate-700 py-3 flex justify-between font-bold text-lg">
                            <span className="text-gray-900 dark:text-white">Total Amount</span>
                            <span className="text-gray-900 dark:text-white">{formatCurrency(bill.after_discount)}</span>
                        </div>

                        {(bill.paid_amount ?? 0) > 0 && (
                            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                <span>Advance Paid</span>
                                <span className="font-semibold">-{formatCurrency(bill.paid_amount)}</span>
                            </div>
                        )}

                        <div className="bg-gray-100 dark:bg-slate-700 px-4 py-3 rounded-lg flex items-center justify-between font-bold text-lg">
                            <span className="text-gray-900 dark:text-white">Balance Due</span>
                            <span className={Number(bill.balance_due ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatCurrency(Number(bill.balance_due ?? 0))}
                            </span>
                        </div>

                        {Number(bill.balance_due ?? 0) > 0 && bill.status !== 'cancelled' && (
                            <button
                                onClick={() => setShowPayModal(true)}
                                className="w-full py-2.5 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                            >
                                <DollarSign className="w-5 h-5" />
                                Pay Balance
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ──────────────────────────────────────────
                PAY BALANCE MODAL
            ────────────────────────────────────────── */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                        <button
                            onClick={() => {
                                setShowPayModal(false);
                                clearErrors();
                                reset();
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            ✕
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Record Payment</h3>

                        <form onSubmit={handlePaySubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Amount to Pay (Max: {formatCurrency(Number(bill.balance_due ?? 0))})
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    max={Number(bill.balance_due ?? 0)}
                                    value={data.amount}
                                    onChange={e => setData('amount', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                />
                                {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Payment Method
                                </label>
                                <select
                                    value={data.payment_method}
                                    onChange={e => setData('payment_method', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    required
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                                {errors.payment_method && <p className="text-sm text-red-500 mt-1">{errors.payment_method}</p>}
                            </div>

                            {(data.payment_method === 'card' || data.payment_method === 'bank_transfer') && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Reference Number
                                        </label>
                                        <input
                                            type="text"
                                            value={data.reference_number}
                                            onChange={e => setData('reference_number', e.target.value)}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Bank Name
                                        </label>
                                        <input
                                            type="text"
                                            value={data.bank_name}
                                            onChange={e => setData('bank_name', e.target.value)}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPayModal(false);
                                        clearErrors();
                                        reset();
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 rounded-lg font-semibold transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition disabled:opacity-50"
                                >
                                    {processing ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
