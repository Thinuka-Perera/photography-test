export default function DiscountInput({ value, onChange }) {
    return (
        <div className="flex items-center gap-2 py-2">
            <label className="text-xs text-gray-500 dark:text-slate-400 flex-1">Cart Discount</label>
            <div className="flex items-center border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                        onChange(
                            Math.min(
                                100,
                                Math.max(0, parseFloat(e.target.value) || 0),
                            ),
                        )
                    }
                    className="w-16 text-center text-sm py-1.5 px-2 border-0 bg-transparent text-gray-800 dark:text-slate-100
                               focus:outline-none focus:ring-0"
                    min={0}
                    max={100}
                    placeholder="0"
                    aria-label="Cart discount percent"
                />
                <span className="pr-2 text-xs text-gray-400 dark:text-slate-400">%</span>
            </div>
        </div>
    );
}
