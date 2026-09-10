import { formatMoney } from '@/utils/format';
import { DollarSign, CreditCard, Wallet, Building2 } from 'lucide-react';

const METHOD_CONFIG = {
    cash: { label: 'Cash', icon: DollarSign, color: 'bg-green-500' },
    card: { label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
    bank_transfer: { label: 'Bank Transfer', icon: Building2, color: 'bg-purple-500' },
    credit: { label: 'Credit Bill', icon: Wallet, color: 'bg-orange-500' },
    advance: { label: 'Advance Payment', icon: Wallet, color: 'bg-amber-500' },
};

export default function PaymentBreakdown({ data }) {
    // data: [{ method: 'cash', count: 5, total: '750.00' }, ...]
    const total = data.reduce((sum, d) => sum + parseFloat(d.total || 0), 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Payment Methods</h3>

            {data.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-400 text-center py-4">No payments today</p>
            ) : (
                <div className="space-y-3">
                    {data.map((d) => {
                        const cfg = METHOD_CONFIG[d.method] ?? {
                            label: d.method,
                            icon: Wallet,
                            color: 'bg-gray-400',
                        };
                        const pct =
                            total > 0 ? (parseFloat(d.total || 0) / total) * 100 : 0;

                        return (
                            <div key={d.method}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                        <cfg.icon className="w-4 h-4" />
                                        {cfg.label}
                                    </span>
                                    <div className="text-right">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {formatMoney(d.total)}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                                            ({d.count} txn)
                                        </span>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${cfg.color} rounded-full transition-all duration-500`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <span>Total Collected</span>
                        <span>{formatMoney(total)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
