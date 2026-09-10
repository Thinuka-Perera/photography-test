import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';

function fmtMoney(value) {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

function fmtDate(value) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return value;
    }
}

export default function CreditManagementIndex({ bills = [], overdueCount = 0, frontOfficers = [], activeType = 'credit' }) {
    const [selectedBill, setSelectedBill] = useState(null);
    const [showOverdueBanner, setShowOverdueBanner] = useState(true);

    const form = useForm({
        amount: '',
        payment_method: 'cash',
        reference_number: '',
        bank_name: '',
        front_officer_id: '',
    });

    const activeBills = useMemo(() => bills ?? [], [bills]);

    const openPaymentModal = (bill) => {
        setSelectedBill(bill);
        form.setData({
            amount: bill?.balance_amount ?? '',
            payment_method: 'cash',
            reference_number: '',
            bank_name: '',
            front_officer_id: '',
        });
        form.clearErrors();
    };

    const closePaymentModal = () => {
        setSelectedBill(null);
        form.reset();
        form.clearErrors();
    };

    const handleTypeSwitch = (type) => {
        router.get(route('studio.credit-management.index'), { type }, { preserveState: false });
    };

    const submitPayment = (e) => {
        e.preventDefault();
        if (!selectedBill) return;

        form.post(route('studio.credit-management.payment', selectedBill.id), {
            preserveScroll: true,
            onSuccess: () => {
                closePaymentModal();
            },
        });
    };

    return (
        <MainLayout pageTitle="Credit Management">
            <Head title="Credit Management" />

            <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Management</h1>
                    <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-700 p-1">
                        <button
                            type="button"
                            onClick={() => handleTypeSwitch('credit')}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg ${activeType === 'credit' ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            Credit Bills
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeSwitch('advance')}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg ${activeType === 'advance' ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            Advance Bills
                        </button>
                    </div>
                </div>

                {showOverdueBanner && overdueCount > 0 ? (
                    <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center justify-between gap-3">
                        <p className="text-sm text-amber-800 dark:text-amber-300">{overdueCount} bill(s) are overdue</p>
                        <button
                            type="button"
                            onClick={() => setShowOverdueBanner(false)}
                            className="text-amber-700 dark:text-amber-300 text-xs font-semibold"
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null}

                <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto">
                    <table className="w-full min-w-[960px]">
                        <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Bill No</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Customer Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Phone</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Total</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Paid</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Balance</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Promise Date</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Created By</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {activeBills.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No bills found.</td>
                                </tr>
                            ) : activeBills.map((bill) => {
                                const settled = bill.status === 'settled' || Number(bill.balance_amount || 0) <= 0;
                                const badgeClass = settled
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : bill.is_overdue
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                                const badgeText = settled ? 'Settled' : bill.is_overdue ? 'Overdue' : 'Outstanding';

                                return (
                                    <tr key={bill.id}>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{bill.bill_number || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{bill.customer_name || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{bill.customer_phone || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{fmtMoney(bill.total_amount)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{fmtMoney(bill.paid_amount)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{fmtMoney(bill.balance_amount)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fmtDate(bill.promise_date)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{bill.created_by_employee?.name || '-'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>{badgeText}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {!settled ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openPaymentModal(bill)}
                                                    className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold"
                                                >
                                                    Record Payment
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedBill ? (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Payment</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Customer: {selectedBill.customer_name || '-'}</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Balance Due: {fmtMoney(selectedBill.balance_amount)}</p>
                            </div>
                            <button type="button" onClick={closePaymentModal} className="text-sm font-semibold text-gray-500 dark:text-gray-300">Close</button>
                        </div>

                        <form onSubmit={submitPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={selectedBill.balance_amount}
                                    value={form.data.amount}
                                    onChange={(e) => form.setData('amount', e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
                                />
                                {form.errors.amount ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.errors.amount}</p> : null}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Payment Method</label>
                                <select
                                    value={form.data.payment_method}
                                    onChange={(e) => form.setData('payment_method', e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                                {form.errors.payment_method ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.errors.payment_method}</p> : null}
                            </div>

                            {form.data.payment_method === 'bank_transfer' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Reference No</label>
                                        <input
                                            type="text"
                                            value={form.data.reference_number}
                                            onChange={(e) => form.setData('reference_number', e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
                                        />
                                        {form.errors.reference_number ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.errors.reference_number}</p> : null}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Bank Name</label>
                                        <input
                                            type="text"
                                            value={form.data.bank_name}
                                            onChange={(e) => form.setData('bank_name', e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
                                        />
                                        {form.errors.bank_name ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.errors.bank_name}</p> : null}
                                    </div>
                                </>
                            ) : null}

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Front Officer</label>
                                <select
                                    value={form.data.front_officer_id}
                                    onChange={(e) => form.setData('front_officer_id', e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
                                >
                                    <option value="">Select front officer</option>
                                    {frontOfficers.map((officer) => (
                                        <option key={officer.id} value={officer.id}>{officer.name}</option>
                                    ))}
                                </select>
                                {form.errors.front_officer_id ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.errors.front_officer_id}</p> : null}
                            </div>

                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                <button type="button" onClick={closePaymentModal} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-gray-200">Cancel</button>
                                <button type="submit" disabled={form.processing} className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                                    {form.processing ? 'Saving...' : 'Save Payment'}
                                </button>
                            </div>
                        </form>

                        <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-x-auto">
                            <table className="w-full min-w-[760px]">
                                <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Date</th>
                                        <th className="px-3 py-2 text-right text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Amount</th>
                                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Method</th>
                                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Reference</th>
                                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Bank Name</th>
                                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Officer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {(selectedBill.payments || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No payments yet.</td>
                                        </tr>
                                    ) : (selectedBill.payments || []).map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{fmtDate(payment.created_at)}</td>
                                            <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-white">{fmtMoney(payment.amount)}</td>
                                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{payment.payment_method}</td>
                                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{payment.reference_number || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{payment.bank_name || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{payment.created_by_employee?.name || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : null}
        </MainLayout>
    );
}
