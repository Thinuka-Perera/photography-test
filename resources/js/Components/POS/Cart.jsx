import { ShoppingCart } from 'lucide-react';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import DiscountInput from './DiscountInput';

export default function Cart({
    items,
    totals,
    taxRate,
    cartDiscountPct,
    onDiscountChange,
    onUpdateQty,
    onRemove,
    onUpdateDiscount,
    onCheckout,
    isEmpty,
}) {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 dark:text-slate-100">Cart</h2>
                {!isEmpty && (
                    <span className="text-xs text-gray-400 dark:text-slate-400">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-300 dark:text-slate-500">
                        <ShoppingCart className="w-8 h-8 mb-2" />
                        <p className="text-sm">Cart is empty</p>
                    </div>
                ) : (
                    items.map((item) => {
                        const processed = totals.processedItems.find(
                            (i) => i.product_id === item.product_id,
                        );

                        return (
                            <CartItem
                                key={item.product_id}
                                item={{
                                    ...item,
                                    line_total: processed?.line_total ?? '0.00',
                                }}
                                onUpdateQty={onUpdateQty}
                                onRemove={onRemove}
                                onUpdateDiscount={onUpdateDiscount}
                            />
                        );
                    })
                )}
            </div>

            {!isEmpty && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-slate-700">
                    <DiscountInput
                        value={cartDiscountPct}
                        onChange={onDiscountChange}
                    />
                    <CartSummary totals={totals} taxRate={taxRate} />
                    <button
                        onClick={onCheckout}
                        className="w-full mt-3 py-3.5 bg-blue-600 text-white font-semibold
                                   rounded-xl hover:bg-blue-700 active:scale-95
                                   transition-all text-sm"
                    >
                        Charge Rs. {totals.total_amount}
                    </button>
                </div>
            )}
        </div>
    );
}
