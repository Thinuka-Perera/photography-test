export default function CartItem({
    item,
    onUpdateQty,
    onRemove,
    onUpdateDiscount,
}) {
    return (
        <div className="flex flex-col gap-1 py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">
                        {item.product_name}
                    </p>
                    {item.product_sku && (
                        <p className="text-xs text-gray-400 dark:text-slate-400">{item.product_sku}</p>
                    )}
                </div>
                <button
                    onClick={() => onRemove(item.product_id)}
                    className="text-gray-300 dark:text-slate-500 hover:text-red-400 transition-colors
                               text-lg leading-none flex-shrink-0"
                    aria-label="Remove item"
                >
                    ×
                </button>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                    <button
                        onClick={() =>
                            onUpdateQty(item.product_id, item.quantity - 1)
                        }
                        className="px-2.5 py-1 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700
                                   transition-colors text-sm font-medium"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                            onUpdateQty(item.product_id, e.target.value)
                        }
                        className="w-10 text-center text-sm py-1 border-0 bg-transparent text-gray-800 dark:text-slate-100
                                   focus:outline-none focus:ring-0"
                        min={1}
                        max={item.stock}
                        aria-label="Quantity"
                    />
                    <button
                        onClick={() =>
                            onUpdateQty(item.product_id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.stock}
                        className="px-2.5 py-1 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700
                                   transition-colors text-sm font-medium
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        value={item.discount_pct}
                        onChange={(e) =>
                            onUpdateDiscount(item.product_id, e.target.value)
                        }
                        className="w-14 text-center text-xs py-1 px-1 border
                                   border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-100 rounded-lg focus:outline-none
                                   focus:ring-1 focus:ring-blue-300"
                        min={0}
                        max={100}
                        placeholder="0"
                        aria-label="Item discount percent"
                    />
                    <span className="text-xs text-gray-400 dark:text-slate-400">%</span>
                </div>

                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 min-w-[60px] text-right">
                    Rs. {item.line_total}
                </p>
            </div>
        </div>
    );
}
