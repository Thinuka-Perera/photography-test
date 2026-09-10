import { Plus, Trash2 } from 'lucide-react';

function formatCurrency(value) {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

export default function EditorCreationChargesPanel({
    creationCharges = [],
    creationChargeTotal = 0,
    dealerCommissions = [],
    dealerCommissionTotal = 0,
    editors = [],
    dealers = [],
    onCreationChargeChange = null,
    onAddCreationCharge = null,
    onRemoveCreationCharge = null,
    onDealerCommissionChange = null,
    onAddDealerCommission = null,
    onRemoveDealerCommission = null,
}) {
    return (
        <div className="space-y-6">
            {/* 1. Creation Charges Panel (Editors Only) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-200">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/10">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Creation Charges</h3>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 tracking-wide uppercase">Editor Assignment & Allowances</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onAddCreationCharge?.()}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all uppercase tracking-widest shadow-sm shadow-slate-900/10"
                        >
                            <Plus className="w-3 h-3" />
                            Add Charge
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {creationCharges.length === 0 ? (
                        <div className="py-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-600 mb-4">
                                <Plus className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">No Creation Charges</p>
                            <button
                                type="button"
                                onClick={() => onAddCreationCharge?.()}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary-600 bg-primary-500/5 border border-primary-500/10 hover:bg-primary-500/10 rounded-xl transition-all uppercase tracking-widest"
                            >
                                Initialize Charges
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {creationCharges.map((charge) => (
                                <div key={charge.id} className="relative group p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                                    <button
                                        type="button"
                                        onClick={() => onRemoveCreationCharge?.(charge.id)}
                                        className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                        aria-label="Remove charge"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest">Descriptor</label>
                                            <input
                                                type="text"
                                                value={charge.label}
                                                onChange={(e) => onCreationChargeChange?.(charge.id, 'label', e.target.value)}
                                                placeholder="e.g. Creative Fee"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest">Assign Editor</label>
                                            <select
                                                value={charge.editor_id || ''}
                                                onChange={(e) => onCreationChargeChange?.(charge.id, 'editor_id', e.target.value ? parseInt(e.target.value) : '')}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                                            >
                                                <option value="">No Editor</option>
                                                {editors.map(ed => (
                                                    <option key={ed.id} value={ed.id}>{ed.name} ({ed.default_commission_pct || 0}%)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative font-semibold">
                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest">Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 tracking-wider">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={charge.amount}
                                                    onChange={(e) => onCreationChargeChange?.(charge.id, 'amount', e.target.value)}
                                                    className="w-full pl-12 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-right font-black text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-5 bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Aggregate Creation Charges</p>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Sum of all editor base fees</p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-black text-white">
                                {formatCurrency(creationChargeTotal).replace('LKR', '')}
                                <span className="text-[10px] ml-1 font-bold text-slate-500">LKR</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Dealer Commissions Panel (Dealers Only) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-200">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/10">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Dealer Commissions</h3>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 tracking-wide uppercase">Dealer Assignment & Referral Fees</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onAddDealerCommission?.()}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all uppercase tracking-widest shadow-sm shadow-slate-900/10"
                        >
                            <Plus className="w-3 h-3" />
                            Add Referral
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {dealerCommissions.length === 0 ? (
                        <div className="py-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-600 mb-4">
                                <Plus className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">No Dealer Commissions</p>
                            <button
                                type="button"
                                onClick={() => onAddDealerCommission?.()}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary-600 bg-primary-500/5 border border-primary-500/10 hover:bg-primary-500/10 rounded-xl transition-all uppercase tracking-widest"
                            >
                                Initialize Dealer Commissions
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dealerCommissions.map((commission) => (
                                <div key={commission.id} className="relative group p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                                    <button
                                        type="button"
                                        onClick={() => onRemoveDealerCommission?.(commission.id)}
                                        className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                        aria-label="Remove commission"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-widest">Descriptor</label>
                                            <input
                                                type="text"
                                                value={commission.label}
                                                onChange={(e) => onDealerCommissionChange?.(commission.id, 'label', e.target.value)}
                                                placeholder="e.g. Referral Fee"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-widest">Assign Dealer</label>
                                            <select
                                                value={commission.dealer_id || ''}
                                                onChange={(e) => onDealerCommissionChange?.(commission.id, 'dealer_id', e.target.value ? parseInt(e.target.value) : '')}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                                            >
                                                <option value="">No Dealer</option>
                                                {dealers.map(dl => (
                                                    <option key={dl.id} value={dl.id}>{dl.name} ({dl.default_commission_pct || 0}%)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative font-semibold">
                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-widest">Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 tracking-wider">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={commission.amount}
                                                    onChange={(e) => onDealerCommissionChange?.(commission.id, 'amount', e.target.value)}
                                                    className="w-full pl-12 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-right font-black text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-5 bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Aggregate Dealer Commissions</p>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Sum of all dealer referral basis amounts</p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-black text-white">
                                {formatCurrency(dealerCommissionTotal).replace('LKR', '')}
                                <span className="text-[10px] ml-1 font-bold text-slate-500">LKR</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
