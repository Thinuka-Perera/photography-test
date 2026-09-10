import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { formatMoney, formatDate } from '@/utils/format';

const STATUS_COLORS = {
    completed: 'bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-300',
    refunded: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    partially_refunded: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    pending: 'bg-yellow-100 dark:bg-amber-900/30 text-yellow-700 dark:text-amber-300',
    cancelled: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300',
};

export default function SaleShow({ sale }) {
    const [showRefund, setShowRefund] = useState(false);

    const totalRefunded =
        sale.refunds
            ?.filter((r) => r.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0) ?? 0;

    const maxRefundableCents =
        Math.round(parseFloat(sale.total_amount) * 100) -
        Math.round(totalRefunded * 100);
    const maxRefundable = (maxRefundableCents / 100).toFixed(2);

    const canRefund =
        maxRefundableCents > 0 &&
        ['completed', 'partially_refunded'].includes(sale.status);

    const { data, setData, post, processing, errors, reset } = useForm({
        sale_id: sale.id,
        amount: maxRefundable,
        reason: '',
    });

    const handleAmountChange = (e) => {
        const raw = parseFloat(e.target.value);
        const clamped = Math.min(raw, parseFloat(maxRefundable));
        setData('amount', isNaN(clamped) ? '' : clamped.toFixed(2));
    };

    const handleRefund = (e) => {
        e.preventDefault();
        post(route('studio.refunds.store'), {
            onSuccess: () => {
                reset('reason');
                setShowRefund(false);
            },
        });
    };

    const totalsRows = [
        { label: 'Subtotal', value: sale.subtotal },
        {
            label: 'Discount',
            value: `-${sale.discount_amount}`,
            hide: parseFloat(sale.discount_amount) === 0,
        },
        {
            label: 'Tax',
            value: sale.tax_amount,
            hide: parseFloat(sale.tax_amount) === 0,
        },
    ].filter((r) => !r.hide);

    return (
        <MainLayout pageTitle="Sale Details">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-4 md:p-6 max-w-4xl mx-auto border border-gray-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 font-mono">
                                {sale.sale_number}
                            </h1>
                            <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[sale.status] ?? ''}`}
                            >
                                {sale.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">
                            {formatDate(sale.created_at, {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                    <button
                        onClick={() => window.history.back()}
                        className="text-sm text-blue-500 dark:text-blue-400 hover:underline"
                    >
                        ← Back
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">Items</h2>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-400 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                                        <th className="pb-2 font-medium">Product</th>
                                        <th className="pb-2 font-medium text-center">Qty</th>
                                        <th className="pb-2 font-medium text-right">Unit Price</th>
                                        <th className="pb-2 font-medium text-right">Disc</th>
                                        <th className="pb-2 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.items.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700">
                                            <td className="py-2.5">
                                                <p className="font-medium text-gray-800 dark:text-slate-100">
                                                    {item.product_name}
                                                    {item.returned_quantity > 0 && (
                                                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                            Returned (Qty: {item.returned_quantity})
                                                        </span>
                                                    )}
                                                </p>
                                                {item.product_sku && (
                                                    <p className="text-xs text-gray-400 dark:text-slate-400">
                                                        {item.product_sku}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-2.5 text-center text-gray-600 dark:text-slate-300">
                                                {item.quantity}
                                            </td>
                                            <td className="py-2.5 text-right text-gray-600 dark:text-slate-300">
                                                {formatMoney(item.unit_price)}
                                            </td>
                                            <td className="py-2.5 text-right text-gray-400 dark:text-slate-400 text-xs">
                                                {parseFloat(item.discount_pct) > 0
                                                    ? `${item.discount_pct}%`
                                                    : '—'}
                                            </td>
                                            <td className="py-2.5 text-right font-semibold text-gray-900 dark:text-slate-100">
                                                {formatMoney(item.line_total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-1.5">
                                {totalsRows.map((row) => (
                                    <div
                                        key={row.label}
                                        className="flex justify-between text-sm text-gray-500 dark:text-slate-400"
                                    >
                                        <span>{row.label}</span>
                                        <span>{formatMoney(row.value)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-slate-100 pt-1.5 border-t border-gray-100 dark:border-slate-700">
                                    <span>Total</span>
                                    <span className="text-blue-600">
                                        {formatMoney(sale.total_amount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {sale.refunds?.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">Refunds</h2>
                                {sale.refunds.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex justify-between items-start py-2 border-b border-gray-50 dark:border-slate-700 last:border-0"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-slate-200 capitalize">
                                                {r.type} Refund
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                                                {r.reason}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-red-500">
                                            − {formatMoney(r.amount)}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-slate-200 pt-2 mt-1 border-t border-gray-100 dark:border-slate-700">
                                    <span>Total Refunded</span>
                                    <span className="text-red-500">
                                        {formatMoney(totalRefunded)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">Payments</h2>
                            {sale.payments.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-slate-700 last:border-0"
                                >
                                    <div>
                                        <p className="text-sm font-medium capitalize text-gray-700 dark:text-slate-200">
                                            {p.method}
                                        </p>
                                        {p.reference_no && (
                                            <p className="text-xs text-gray-400 dark:text-slate-400">
                                                Ref: {p.reference_no}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                        {formatMoney(p.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {canRefund && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                                        Process Refund
                                    </h2>
                                    <span className="text-xs text-gray-400 dark:text-slate-400">
                                        Max: {formatMoney(maxRefundable)}
                                    </span>
                                </div>

                                {!showRefund ? (
                                    <button
                                        onClick={() => setShowRefund(true)}
                                        className="w-full py-2.5 border border-red-200 dark:border-red-800/60 text-red-500 dark:text-red-300 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        Issue Refund
                                    </button>
                                ) : (
                                    <form onSubmit={handleRefund} className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                                                Refund Amount
                                            </label>
                                            <input
                                                type="number"
                                                value={data.amount}
                                                onChange={handleAmountChange}
                                                disabled={processing}
                                                max={maxRefundable}
                                                min="0.01"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                                            />
                                            {errors.amount && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    {errors.amount}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                                                Reason
                                            </label>
                                            <textarea
                                                value={data.reason}
                                                onChange={(e) =>
                                                    setData('reason', e.target.value)
                                                }
                                                disabled={processing}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                                                placeholder="Reason for refund..."
                                            />
                                            {errors.reason && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    {errors.reason}
                                                </p>
                                            )}
                                        </div>
                                        {errors.refund && (
                                            <p className="text-xs text-red-500">{errors.refund}</p>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowRefund(false)}
                                                disabled={processing}
                                                className="flex-1 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                                            >
                                                {processing ? 'Processing...' : 'Confirm'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
