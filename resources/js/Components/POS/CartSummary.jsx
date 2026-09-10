export default function CartSummary({ totals, taxRate }) {
    return (
        <div className="space-y-2 py-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span>Rs. {totals.subtotal}</span>
            </div>

            {parseFloat(totals.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>− Rs. {totals.discount_amount}</span>
                </div>
            )}

            {taxRate > 0 && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400">
                    <span>Tax ({taxRate}%)</span>
                    <span>Rs. {totals.tax_amount}</span>
                </div>
            )}

            <div className="flex justify-between text-base font-bold text-gray-900 dark:text-slate-100
                            pt-2 border-t border-gray-200 dark:border-slate-700">
                <span>Total</span>
                <span className="text-blue-600">Rs. {totals.total_amount}</span>
            </div>
        </div>
    );
}
