import { useMemo } from 'react';
import { Trash2, Plus, ChevronDown, User } from 'lucide-react';
import CategorySearchSelect from '@/Components/POS/CategorySearchSelect';

function formatCurrency(value) {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

export default function ManualEntryTab({
    rows = [],
    itemTypes = [],
    editors = [],
    selectedEditorId = '',
    commissionPct = '',
    applyCommission = true,
    commissionableAmount = 0,
    commissionAmount = 0,
    commissionLocked = false,
    commissionEditable = true,

    dealers = [],
    selectedDealerId = '',
    dealerCommissionPct = '',
    applyDealerCommission = true,
    dealerCommissionableAmount = 0,
    dealerCommissionAmount = 0,
    dealerCommissionLocked = false,
    dealerCommissionEditable = true,

    onAddRow,
    onUpdateRow,
    onRemoveRow,
    onEditorChange,
    onCommissionPctChange,
    onApplyCommissionChange,

    onDealerChange,
    onDealerCommissionPctChange,
    onApplyDealerCommissionChange,
}) {
    const itemTypeMap = useMemo(() => {
        return Object.fromEntries(itemTypes.map((itemType) => [String(itemType.id), itemType]));
    }, [itemTypes]);

    return (
        <div className="space-y-8 p-6 lg:p-8">
            <div className="overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Line Items</h3>
                        <p className="text-xs text-slate-400 mt-1">Specify services and quantities for this transaction.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onAddRow}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Item
                    </button>
                </div>

                <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                    <table className="w-full min-w-[900px] border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Job Description</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest w-24">Qty</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest w-40">Unit Price</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest w-44">Total</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {rows.map((row, index) => {
                                const selectedItemType = row.category_id ? itemTypeMap[String(row.category_id)] : null;
                                const noCommission = selectedItemType?.no_commission === true
                                    || selectedItemType?.no_commission === 1;

                                return (
                                    <tr
                                        key={row.id}
                                        className={`group hover:bg-white dark:hover:bg-slate-800/50 transition-colors ${noCommission ? 'bg-orange-50/20 dark:bg-orange-900/5' : ''}`}
                                    >
                                        <td className="px-6 py-4 w-56">
                                            <CategorySearchSelect
                                                value={row.category_id ?? ''}
                                                itemTypes={itemTypes}
                                                onChange={(categoryId) => onUpdateRow(row.id, 'category_id', categoryId)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={row.description}
                                                    onChange={(e) => onUpdateRow(row.id, 'description', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                                    placeholder={`Service details...`}
                                                />
                                                {noCommission && (
                                                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/40 text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-sm">
                                                        No Comm.
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 w-24">
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={row.quantity}
                                                onChange={(e) => onUpdateRow(row.id, 'quantity', e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-center font-semibold text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-550 transition-all"
                                            />
                                        </td>
                                        <td className="px-6 py-4 w-40">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={row.unit_price}
                                                    onChange={(e) => onUpdateRow(row.id, 'unit_price', e.target.value)}
                                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-right font-semibold text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-550 transition-all"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 w-44 text-right">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {formatCurrency((Number(row.quantity || 0) * Number(row.unit_price || 0)).toFixed(2))}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right w-16">
                                            <button
                                                type="button"
                                                onClick={() => onRemoveRow(row.id)}
                                                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                                aria-label="Delete row"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
