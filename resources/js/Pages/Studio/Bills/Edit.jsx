import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

function BillLineItem({
    index,
    item,
    itemTypes,
    onChange,
    onDelete,
    isCommissionable,
}) {
    const unitPrice = parseFloat(item.unit_price || 0);
    const quantity = parseFloat(item.quantity || 0);
    const lineTotal = unitPrice * quantity;

    return (
        <tr className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
            <td className="px-4 py-3">
                <select
                    value={item.category_id || ''}
                    onChange={e =>
                        onChange(index, {
                            ...item,
                            category_id: e.target.value ? parseInt(e.target.value) : null,
                        })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                >
                    <option value="">Manual</option>
                    {itemTypes.map(itemType => (
                        <option key={itemType.id} value={itemType.id}>
                            {itemType.name}
                            {itemType.no_commission ? ' (no comm)' : ''}
                        </option>
                    ))}
                </select>
            </td>
            <td className="px-4 py-3">
                <input
                    type="text"
                    value={item.description || ''}
                    onChange={e => onChange(index, { ...item, description: e.target.value })}
                    placeholder="Item description"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                />
            </td>
            <td className="px-4 py-3">
                <input
                    type="number"
                    value={item.quantity || 0}
                    onChange={e =>
                        onChange(index, { ...item, quantity: Math.max(0, parseFloat(e.target.value)) })
                    }
                    min="0"
                    step="0.01"
                    className="w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                />
            </td>
            <td className="px-4 py-3">
                <input
                    type="number"
                    value={item.unit_price || 0}
                    onChange={e =>
                        onChange(index, { ...item, unit_price: Math.max(0, parseFloat(e.target.value)) })
                    }
                    min="0"
                    step="0.01"
                    className="w-32 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                />
            </td>
            <td className="px-4 py-3 text-right">
                <span className="font-bold text-gray-900 dark:text-white">
                    {Number(lineTotal).toFixed(2)}
                </span>
                {!isCommissionable && item.category_id && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">no commission</p>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                <button
                    onClick={() => onDelete(index)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

export default function EditBill({ bill, itemTypes = [], editors, dealers = [] }) {
    const { data, setData, processing, errors } = useForm({
        items: bill.items.map(item => ({
            id: item.id,
            category_id: item.category_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            is_stock_item: !!item.stock_item_id,
            stock_item_id: item.stock_item_id,
        })),
        editor_id: bill.editor_id,
        commission_pct: bill.commission_pct || 15,
        is_commission_applicable: !!bill.is_commission_applicable,
        dealer_id: bill.dealer_id,
        dealer_commission_pct: bill.dealer_commission_pct || 0,
        is_dealer_commission_applicable: !!bill.is_dealer_commission_applicable,
        discount_amount: bill.discount_amount || 0,
        payment_method: bill.payment_method,
        notes: bill.notes || '',
        status: bill.status,
    });

    const subtotal = useMemo(() => {
        return data.items.reduce((sum, item) => {
            const line = (item.unit_price || 0) * (item.quantity || 0);
            return sum + line;
        }, 0);
    }, [data.items]);

    const afterDiscount = Math.max(0, subtotal - (data.discount_amount || 0));

    const commissionableAmount = useMemo(() => {
        if (!data.is_commission_applicable) return 0;
        return Number(bill.creation_charge || 0);
    }, [data.is_commission_applicable, bill.creation_charge]);

    const commissionAmount = useMemo(() => {
        if (!data.is_commission_applicable || !data.editor_id) return 0;
        return (commissionableAmount * data.commission_pct) / 100;
    }, [commissionableAmount, data.commission_pct, data.is_commission_applicable, data.editor_id]);

    const dealerCommissionableAmount = useMemo(() => {
        if (!data.is_dealer_commission_applicable) return 0;
        return Number(bill.creation_charge || 0);
    }, [data.is_dealer_commission_applicable, bill.creation_charge]);

    const dealerCommissionAmount = useMemo(() => {
        if (!data.is_dealer_commission_applicable || !data.dealer_id) return 0;
        return (dealerCommissionableAmount * data.dealer_commission_pct) / 100;
    }, [dealerCommissionableAmount, data.dealer_commission_pct, data.is_dealer_commission_applicable, data.dealer_id]);

    useEffect(() => {
        if (!data.editor_id) {
            setData('commission_pct', 0);
            return;
        }
        const ed = editors.find(e => String(e.id) === String(data.editor_id));
        if (ed && String(ed.id) !== String(bill.editor_id)) {
            setData('commission_pct', ed.default_commission_pct != null ? Number(ed.default_commission_pct) : 0);
        }
    }, [data.editor_id, editors, bill.editor_id]);

    useEffect(() => {
        if (!data.dealer_id) {
            setData('dealer_commission_pct', 0);
            return;
        }
        const dl = dealers.find(d => String(d.id) === String(data.dealer_id));
        if (dl && String(dl.id) !== String(bill.dealer_id)) {
            setData('dealer_commission_pct', dl.default_commission_pct != null ? Number(dl.default_commission_pct) : 0);
        }
    }, [data.dealer_id, dealers, bill.dealer_id]);

    const addLineItem = () => {
        setData('items', [
            ...data.items,
            { category_id: null, description: '', quantity: 1, unit_price: 0, is_stock_item: false },
        ]);
    };

    const deleteLineItem = index => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const updateLineItem = (index, newItem) => {
        const updated = [...data.items];
        updated[index] = newItem;
        setData('items', updated);
    };

    const handleSubmit = e => {
        e.preventDefault();
        router.put(route('studio.bills.update', bill.id), data);
    };

    return (
        <MainLayout pageTitle={`Edit Bill ${bill.bill_number}`}>
            <Head title={`Edit Bill ${bill.bill_number}`} />

            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                </button>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${bill.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                        bill.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>
                        {bill.status}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 dark:text-white">Bill Items</h3>
                                <button
                                    type="button"
                                    onClick={addLineItem}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                                >
                                    <Plus className="w-4 h-4 inline mr-1" />
                                    Add Item
                                </button>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">Type</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">Description</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">Qty</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">Price</th>
                                        <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">Total</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, idx) => (
                                        <BillLineItem
                                            key={idx}
                                            index={idx}
                                            item={item}
                                            itemTypes={itemTypes}
                                            onChange={updateLineItem}
                                            onDelete={deleteLineItem}
                                            isCommissionable={!itemTypes.find(c => c.id === item.category_id)?.no_commission}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Commission & Notes</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Editor</label>
                                        <select
                                            value={data.editor_id || ''}
                                            onChange={e => setData('editor_id', e.target.value ? parseInt(e.target.value) : null)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">None</option>
                                            {editors.map(ed => (
                                                <option key={ed.id} value={ed.id}>{ed.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Rate % (Fixed)</label>
                                            <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm font-semibold">
                                                {data.commission_pct || 0}%
                                            </div>
                                        </div>
                                        <div className="pt-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_commission_applicable}
                                                    onChange={e => setData('is_commission_applicable', e.target.checked)}
                                                    className="rounded border-gray-300"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Apply</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Dealer</label>
                                        <select
                                            value={data.dealer_id || ''}
                                            onChange={e => setData('dealer_id', e.target.value ? parseInt(e.target.value) : null)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">None</option>
                                            {dealers.map(dl => (
                                                <option key={dl.id} value={dl.id}>{dl.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Rate % (Fixed)</label>
                                            <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm font-semibold">
                                                {data.dealer_commission_pct || 0}%
                                            </div>
                                        </div>
                                        <div className="pt-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_dealer_commission_applicable}
                                                    onChange={e => setData('is_dealer_commission_applicable', e.target.checked)}
                                                    className="rounded border-gray-300"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Apply</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Internal Notes</label>
                                    <textarea
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        rows="4"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        placeholder="Add any internal notes here..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 sticky top-6">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Summary</h3>
                            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{Number(subtotal).toFixed(2)}</span>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Discount Amount</label>
                                    <input
                                        type="number"
                                        value={data.discount_amount}
                                        onChange={e => setData('discount_amount', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                    />
                                </div>
                                <div className="flex justify-between pt-4 text-lg font-bold border-t border-gray-200 dark:border-slate-700">
                                    <span className="text-gray-900 dark:text-white">Total</span>
                                    <span className="text-primary-600 dark:text-primary-400">LKR {Number(afterDiscount).toFixed(2)}</span>
                                </div>
                            </div>

                            {data.is_commission_applicable && data.editor_id && (
                                <div className="mb-6 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-primary-700 dark:text-primary-300">Est. Commission</span>
                                        <span className="font-bold text-primary-600 dark:text-primary-400">LKR {Number(commissionAmount).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {data.is_dealer_commission_applicable && data.dealer_id && (
                                <div className="mb-6 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-primary-700 dark:text-primary-300">Est. Dealer Comm.</span>
                                        <span className="font-bold text-primary-600 dark:text-primary-400">LKR {Number(dealerCommissionAmount).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-primary-500/20"
                            >
                                <Save className="w-5 h-5" />
                                {processing ? 'Updating...' : 'Update Bill'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </MainLayout>
    );
}
