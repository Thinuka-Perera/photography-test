import { useState } from 'react';
import { DollarSign, CreditCard } from 'lucide-react';

export default function PaymentModal({ total, onConfirm, onClose, processing }) {
    const [mode, setMode] = useState('single'); // 'single' | 'split'
    const [method, setMethod] = useState('cash');
    const [cashGiven, setCashGiven] = useState('');
    const [reference, setReference] = useState('');

    // Split payment state
    const [cashAmount, setCashAmount] = useState('');
    const [cardAmount, setCardAmount] = useState('');
    const [cardRef, setCardRef] = useState('');

    const totalNum = parseFloat(total);

    // Change due for cash payments
    const change =
        mode === 'single' && method === 'cash' && cashGiven !== ''
            ? Math.max(0, parseFloat(cashGiven) - totalNum).toFixed(2)
            : null;

    // Split validation — use integer cents to avoid float edge cases
    const splitTotalCents = Math.round(
        (parseFloat(cashAmount || 0) + parseFloat(cardAmount || 0)) * 100,
    );
    const expectedTotalCents = Math.round(totalNum * 100);
    const splitValid = splitTotalCents === expectedTotalCents;

    // Single payment — cash requires sufficient amount, card requires reference
    const singleValid =
        method === 'cash'
            ? parseFloat(cashGiven) >= totalNum
            : reference.trim() !== '';

    const canConfirm = !processing && (mode === 'single' ? singleValid : splitValid);

    const handleConfirm = () => {
        if (!canConfirm) return;

        if (mode === 'single') {
            // Always send as array — matches StoreSaleRequest 'payment.*.method' rules
            onConfirm([
                {
                    method,
                    amount: totalNum,
                    reference_no: method === 'card' ? reference.trim() : null,
                    gateway: method === 'card' ? 'manual' : null,
                },
            ]);
        } else {
            // Split: build array, only include rows with a real amount
            const payments = [];
            if (parseFloat(cashAmount) > 0) {
                payments.push({
                    method: 'cash',
                    amount: parseFloat(cashAmount),
                    reference_no: null,
                    gateway: null,
                });
            }
            if (parseFloat(cardAmount) > 0) {
                payments.push({
                    method: 'card',
                    amount: parseFloat(cardAmount),
                    reference_no: cardRef.trim() || null,
                    gateway: 'manual',
                });
            }
            onConfirm(payments);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-slate-700">
                <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-white font-semibold text-lg">Payment</h2>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="text-white/70 hover:text-white text-2xl"
                        aria-label="Close payment modal"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-slate-400">Amount Due</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">Rs. {total}</p>
                    </div>

                    <div className="flex gap-2">
                        {['single', 'split'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                disabled={processing}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium
                                    transition-colors
                                    ${
                                        mode === m
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {m === 'single' ? 'Single Payment' : 'Split Payment'}
                            </button>
                        ))}
                    </div>

                    {mode === 'single' ? (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                {['cash', 'card'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMethod(m)}
                                        disabled={processing}
                                        className={`flex-1 py-3 rounded-xl text-sm font-medium
                                            transition-colors capitalize
                                            ${
                                                method === m
                                                    ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                                                    : 'bg-gray-50 dark:bg-slate-700 border-2 border-transparent text-gray-600 dark:text-slate-300'
                                            }`}
                                    >
                                        {m === 'cash' ? (
                                            <><DollarSign className="w-4 h-4 inline mr-1" />Cash</>
                                        ) : (
                                            <><CreditCard className="w-4 h-4 inline mr-1" />Card</>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {method === 'cash' ? (
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                                        Cash Given
                                    </label>
                                    <input
                                        type="number"
                                        value={cashGiven}
                                        onChange={(e) => setCashGiven(e.target.value)}
                                        disabled={processing}
                                        className="w-full px-4 py-3 border border-gray-200
                                                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100
                                                   rounded-xl text-center text-lg font-semibold
                                                   focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        placeholder="0.00"
                                        min={totalNum}
                                        autoFocus
                                    />
                                    {change !== null && parseFloat(cashGiven) >= totalNum && (
                                        <div className="mt-2 p-3 bg-green-50 dark:bg-emerald-900/30 rounded-xl text-center">
                                            <p className="text-xs text-green-600 dark:text-emerald-300">Change Due</p>
                                            <p className="text-xl font-bold text-green-700 dark:text-emerald-200">
                                                Rs. {change}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                                        Card Reference / Terminal ID
                                    </label>
                                    <input
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        disabled={processing}
                                        className="w-full px-4 py-2.5 border border-gray-200
                                                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500
                                                   rounded-xl text-sm focus:outline-none
                                                   focus:ring-2 focus:ring-blue-300"
                                        placeholder="e.g. TXN-20260418-001"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4" />
                                    Cash Amount
                                </label>
                                <input
                                    type="number"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                    disabled={processing}
                                    className="w-full px-4 py-2.5 border border-gray-200
                                               dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100
                                               rounded-xl text-sm focus:outline-none
                                               focus:ring-2 focus:ring-blue-300"
                                    placeholder="0.00"
                                    min={0}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4" />
                                    Card Amount
                                </label>
                                <input
                                    type="number"
                                    value={cardAmount}
                                    onChange={(e) => setCardAmount(e.target.value)}
                                    disabled={processing}
                                    className="w-full px-4 py-2.5 border border-gray-200
                                               dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100
                                               rounded-xl text-sm focus:outline-none
                                               focus:ring-2 focus:ring-blue-300"
                                    placeholder="0.00"
                                    min={0}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                                    Card Reference
                                </label>
                                <input
                                    type="text"
                                    value={cardRef}
                                    onChange={(e) => setCardRef(e.target.value)}
                                    disabled={processing}
                                    className="w-full px-4 py-2.5 border border-gray-200
                                               dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500
                                               rounded-xl text-sm focus:outline-none
                                               focus:ring-2 focus:ring-blue-300"
                                    placeholder="Terminal ref (optional)"
                                />
                            </div>

                            <div
                                className={`p-2 rounded-lg text-center text-xs font-medium
                                ${
                                    splitValid
                                        ? 'bg-green-50 dark:bg-emerald-900/30 text-green-600 dark:text-emerald-300'
                                        : 'bg-orange-50 dark:bg-amber-900/30 text-orange-600 dark:text-amber-300'
                                }`}
                            >
                                {splitValid
                                    ? '✓ Amounts match total'
                                    : `Remaining: Rs. ${((expectedTotalCents - splitTotalCents) / 100).toFixed(2)}`}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="w-full py-3.5 bg-blue-600 text-white font-semibold
                                   rounded-xl transition-all
                                   hover:bg-blue-700 active:scale-95
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing
                            ? 'Processing...'
                            : `Confirm Payment · Rs. ${total}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
