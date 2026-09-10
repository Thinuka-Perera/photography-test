import { Printer } from 'lucide-react';

export default function ReceiptModal({ receipt, onClose, onNewSale }) {
    const handlePrint = () => window.print();

    const subtotal = parseFloat(receipt.subtotal ?? 0);
    const discount = parseFloat(receipt.discount_amount ?? 0);
    const tax = parseFloat(receipt.tax_amount ?? 0);
    const total = parseFloat(receipt.total_amount ?? 0);

    const paidTotal = (receipt.payments ?? []).reduce(
        (sum, p) => sum + parseFloat(p.amount ?? 0),
        0,
    );

    const completedAt = receipt.completed_at
        ? new Date(receipt.completed_at).toLocaleString('en-LK', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:bg-white print:inset-0">
            <style>{`
                @media print {
                    @page { size: auto; margin: 8mm; }
                    body * { visibility: hidden !important; }
                    .receipt-print-target,
                    .receipt-print-target * { visibility: visible !important; }
                    .receipt-print-target {
                        position: fixed !important;
                        inset: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        z-index: 9999 !important;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 print:shadow-none print:rounded-none print:max-w-full border border-gray-200 dark:border-slate-700">
                <div className="receipt-print-target p-6 max-w-md mx-auto">
                    <div className="text-center mb-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-2xl">✓</span>
                        </div>
                        <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg">Sale Complete</h2>
                        <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-mono">
                            {receipt.sale_number}
                        </p>
                        {completedAt && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Completed: {completedAt}</p>
                        )}
                    </div>

                    <div className="mb-4 rounded-xl bg-gray-50 dark:bg-slate-700/60 px-3 py-2 space-y-1">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-300">
                            <span>Cashier</span>
                            <span className="font-medium text-gray-800 dark:text-slate-100">{receipt.cashier_name ?? '—'}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-300">
                            <span>Editor</span>
                            <span className="font-medium text-gray-800 dark:text-slate-100">{receipt.editor_name ?? '—'}</span>
                        </div>
                    </div>

                    <div className="space-y-1.5 mb-4">
                        <h3 className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-400 font-semibold">Items</h3>
                        {receipt.items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                                <div className="min-w-0">
                                    <p className="text-gray-700 dark:text-slate-200 font-medium truncate">{item.name}</p>
                                    <p className="text-[11px] text-gray-400 dark:text-slate-400">
                                        {item.sku ? `${item.sku} • ` : ''}{item.qty} × Rs. {parseFloat(item.unit_price ?? 0).toFixed(2)}
                                    </p>
                                </div>
                                <span className="font-medium whitespace-nowrap text-gray-900 dark:text-slate-100">
                                    Rs. {parseFloat(item.line_total).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-dashed border-gray-300 dark:border-slate-600 pt-3 mb-4 space-y-1.5">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
                            <span>Subtotal</span>
                            <span>Rs. {subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Discount</span>
                                <span>- Rs. {discount.toFixed(2)}</span>
                            </div>
                        )}
                        {tax > 0 && (
                            <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
                                <span>Tax</span>
                                <span>Rs. {tax.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base text-gray-900 dark:text-slate-100">
                            <span>Total</span>
                            <span className="text-blue-600">
                                Rs. {total.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1 mb-4">
                        <h3 className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-400 font-semibold">Payments</h3>
                        {receipt.payments.map((p) => (
                            <div
                                key={p.id}
                                className="flex justify-between text-xs text-gray-500 dark:text-slate-400"
                            >
                                <span className="capitalize">{p.method}</span>
                                <span>Rs. {parseFloat(p.amount).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-slate-200 pt-1 border-t border-gray-100 dark:border-slate-700">
                            <span>Total Paid</span>
                            <span>Rs. {paidTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <p className="text-center text-xs text-gray-400 dark:text-slate-400">
                        Thank you for your business!
                    </p>
                </div>

                <div className="no-print flex gap-2 px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-3 border border-gray-200 rounded-xl
                                   dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close receipt"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl
                                   dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                    <button
                        onClick={onNewSale}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl
                                   text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        New Sale
                    </button>
                </div>
            </div>
        </div>
    );
}
