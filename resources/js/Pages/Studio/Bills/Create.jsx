import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { Plus, Trash2 } from 'lucide-react';

// ─────────────────────────────────────────────
// BillLineItem — Single row in bill items table
// ─────────────────────────────────────────────
function BillLineItem({
    index,
    item,
    itemTypes,
    onChange,
    onDelete,
    isCommissionable,
}) {
    const unitPriceCents = Math.round((item.unit_price || 0) * 100);
    const quantityCents = Math.round((item.quantity || 0) * 100);
    const lineTotalCents = unitPriceCents * quantityCents;
    const lineTotalLKR = lineTotalCents / 10000;

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
                        onChange(index, { ...item, quantity: Math.max(0, e.target.value) })
                    }
                    min="0"
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
                    {Number(lineTotalLKR).toFixed(2)}
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

// ─────────────────────────────────────────────
// Main Create Bill Form
// ─────────────────────────────────────────────
export default function CreateBill({ itemTypes = [], editors, dealers = [], defaultCommissionPct }) {
    const { data, setData, processing, errors, reset } = useForm({
        items: [{ category_id: null, description: '', quantity: 1, unit_price: 0, autoFilled: false }],
        editor_id: null,
        commission_pct: defaultCommissionPct || 10,
        apply_commission: true,
        dealer_id: null,
        dealer_commission_pct: 0,
        apply_dealer_commission: true,
        discount_type: 'amount',
        discount_value: 0,
        advance_ref_bill_id: null,
        deduct_advance: false,
        payment_method: 'cash',
        card_reference: '',
    });

    const [advanceSearchOpen, setAdvanceSearchOpen] = useState(false);
    const [advanceBills, setAdvanceBills] = useState([]);

    // ── Calculate totals ──────────────────────────────
    const subtotal = useMemo(() => {
        return data.items.reduce((sum, item) => {
            const line = (item.unit_price || 0) * (item.quantity || 0);
            return sum + line;
        }, 0);
    }, [data.items]);

    const discountAmount = useMemo(() => {
        if (data.discount_type === 'percentage') {
            return (subtotal * data.discount_value) / 100;
        }
        return data.discount_value || 0;
    }, [subtotal, data.discount_type, data.discount_value]);

    const afterDiscount = Math.max(0, subtotal - discountAmount);

    // ── Commissionable amount (exclude no_commission categories) ──
    const commissionableAmount = useMemo(() => {
        if (!data.apply_commission) return 0;

        return data.items.reduce((sum, item) => {
            const line = (item.unit_price || 0) * (item.quantity || 0);
            if (item.category_id) {
                const cat = itemTypes.find(c => c.id === item.category_id);
                if (cat?.no_commission) return sum; // Skip Passport, etc.
            }
            return sum + line;
        }, 0);
    }, [data.items, data.apply_commission, itemTypes]);

    const commissionAmount = useMemo(() => {
        if (!data.apply_commission || !data.editor_id) return 0;
        return (commissionableAmount * data.commission_pct) / 100;
    }, [commissionableAmount, data.commission_pct, data.apply_commission, data.editor_id]);

    // ── Dealer Commissionable amount ──
    const dealerCommissionableAmount = useMemo(() => {
        return 0; // Since there is no creation charge field in this form (creation_charge is always 0 here)
    }, []);

    const dealerCommissionAmount = useMemo(() => {
        if (!data.apply_dealer_commission || !data.dealer_id) return 0;
        return (dealerCommissionableAmount * data.dealer_commission_pct) / 100;
    }, [dealerCommissionableAmount, data.dealer_commission_pct, data.apply_dealer_commission, data.dealer_id]);

    useEffect(() => {
        if (!data.editor_id) {
            setData('commission_pct', 0);
            return;
        }
        const ed = editors.find(e => String(e.id) === String(data.editor_id));
        setData('commission_pct', ed?.default_commission_pct != null ? Number(ed.default_commission_pct) : 0);
    }, [data.editor_id, editors]);

    useEffect(() => {
        if (!data.dealer_id) {
            setData('dealer_commission_pct', 0);
            return;
        }
        const dl = dealers.find(d => String(d.id) === String(data.dealer_id));
        setData('dealer_commission_pct', dl?.default_commission_pct != null ? Number(dl.default_commission_pct) : 0);
    }, [data.dealer_id, dealers]);

    const balanceDue = Math.max(0, afterDiscount - (data.deduct_advance ? (data.advance_ref_bill_id || 0) : 0));

    // ── Handlers ──────────────────────────────────────
    const addLineItem = () => {
        setData('items', [
            ...data.items,
            { category_id: null, description: '', quantity: 1, unit_price: 0, autoFilled: false },
        ]);
    };

    const deleteLineItem = index => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const updateLineItem = (index, newItem) => {
        const updated = [...data.items];
        if (newItem?.description !== undefined && newItem.description !== updated[index]?.description) {
            newItem.autoFilled = false;
        }

        if (Object.prototype.hasOwnProperty.call(newItem, 'category_id')) {
            const selectedItemType = itemTypes.find((itemType) => itemType.id === newItem.category_id);
            const shouldAutoFill = updated[index]?.autoFilled || !updated[index]?.description;
            if (shouldAutoFill) {
                newItem.description = selectedItemType?.default_description || '';
                newItem.autoFilled = Boolean(selectedItemType?.default_description);
            }
        }
        updated[index] = newItem;
        setData('items', updated);
    };

    const handleSubmit = e => {
        e.preventDefault();

        if (data.items.length === 0) {
            alert('Add at least one item to the bill');
            return;
        }

        if (data.apply_commission && !data.editor_id) {
            alert('Please select an editor for commission calculation');
            return;
        }

        // Format payload for backend
        const payload = {
            items: data.items,
            editor_id: data.editor_id,
            commission_pct: data.commission_pct,
            apply_commission: data.apply_commission,
            dealer_id: data.dealer_id,
            dealer_commission_pct: data.dealer_commission_pct,
            is_dealer_commission_applicable: data.apply_dealer_commission,
            discount_amount: discountAmount,
            advance_deducted: data.deduct_advance ? (data.advance_ref_bill_id || 0) : 0,
            payment_method: data.payment_method,
            card_reference: data.card_reference || null,
        };

        router.post(route('studio.bills.store'), payload, {
            onSuccess: () => {
                reset();
                // Show success message — Inertia flash will display in Toast
            },
            onError: () => {
                // Validation errors in `errors` prop
            },
        });
    };

    return (
        <MainLayout pageTitle="Create Bill">
            <Head title="Create Bill" />

            <form onSubmit={handleSubmit} className="space-y-6">
                {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        <p className="font-bold mb-1">Please fix the following errors:</p>
                        <ul className="list-disc list-inside">
                            {Object.values(errors).map((error, idx) => (
                                <li key={idx}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ─────────────────────────────────────────
                      LEFT COLUMN: Line Items
                      ───────────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={addLineItem}
                                className="px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                            >
                                <Plus className="w-4 h-4 inline mr-1" />
                                Manual Item
                            </button>
                        </div>

                        {/* Line Items Table */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">
                                            Item Type
                                        </th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">
                                            Description
                                        </th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">
                                            Qty
                                        </th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">
                                            Unit Price
                                        </th>
                                        <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                                            Line Total
                                        </th>
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
                                            isCommissionable={
                                                !itemTypes.find(c => c.id === item.category_id)
                                                    ?.no_commission
                                            }
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Editor + Commission Section */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                                Commission
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Assigned Editor
                                    </label>
                                    <select
                                        value={data.editor_id || ''}
                                        onChange={e => setData('editor_id', e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">None</option>
                                        {editors.map(ed => (
                                            <option key={ed.id} value={ed.id}>
                                                {ed.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Commission % (Fixed)
                                    </label>
                                    <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm font-semibold">
                                        {data.commission_pct || 0}%
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Apply Commission
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setData('apply_commission', !data.apply_commission)}
                                        className={`w-full px-3 py-2 rounded-lg font-medium transition-colors ${data.apply_commission
                                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {data.apply_commission ? 'YES' : 'NO'}
                                    </button>
                                </div>
                            </div>

                            {/* Commission Summary */}
                            {data.apply_commission && (
                                <div className="mt-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-primary-900 dark:text-primary-200">
                                            Commissionable Amount:
                                        </span>
                                        <span className="font-bold text-primary-600 dark:text-primary-400">
                                            LKR {Number(commissionableAmount).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary-200 dark:border-primary-800">
                                        <span className="text-sm font-medium text-primary-900 dark:text-primary-200">
                                            Commission:
                                        </span>
                                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                                            LKR {Number(commissionAmount).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dealer + Commission Section */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                                Dealer Commission
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Assigned Dealer
                                    </label>
                                    <select
                                        value={data.dealer_id || ''}
                                        onChange={e => setData('dealer_id', e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">None</option>
                                        {dealers.map(dl => (
                                            <option key={dl.id} value={dl.id}>
                                                {dl.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Commission % (Fixed)
                                    </label>
                                    <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm font-semibold">
                                        {data.dealer_commission_pct || 0}%
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Apply Commission
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setData('apply_dealer_commission', !data.apply_dealer_commission)}
                                        className={`w-full px-3 py-2 rounded-lg font-medium transition-colors ${data.apply_dealer_commission
                                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {data.apply_dealer_commission ? 'YES' : 'NO'}
                                    </button>
                                </div>
                            </div>

                            {/* Dealer Commission Summary */}
                            {data.apply_dealer_commission && (
                                <div className="mt-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-primary-900 dark:text-primary-200">
                                            Commissionable Amount:
                                        </span>
                                        <span className="font-bold text-primary-600 dark:text-primary-400">
                                            LKR {Number(dealerCommissionableAmount).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary-200 dark:border-primary-800">
                                        <span className="text-sm font-medium text-primary-900 dark:text-primary-200">
                                            Commission Amount:
                                        </span>
                                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                                            LKR {Number(dealerCommissionAmount).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────
                      RIGHT COLUMN: Bill Summary + Payment
                      ───────────────────────────────────────── */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Bill Summary Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 sticky top-6">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">
                                Bill Summary
                            </h3>

                            {/* Summary Lines */}
                            <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {Number(subtotal).toFixed(2)}
                                    </span>
                                </div>

                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Discount</span>
                                        <span className="font-bold text-red-600 dark:text-red-400">
                                            −{Number(discountAmount).toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-gray-700 dark:text-gray-300">After Discount</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {Number(afterDiscount).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Discount Section */}
                            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Discount
                                </p>
                                <div className="flex gap-2 mb-2">
                                    {['amount', 'percentage'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setData('discount_type', type)}
                                            className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors ${data.discount_type === type
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {type === 'amount' ? 'LKR' : '%'}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    value={data.discount_value || 0}
                                    onChange={e => setData('discount_value', parseFloat(e.target.value))}
                                    min="0"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                />
                            </div>

                            {/* Advance Section */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.deduct_advance}
                                        onChange={e => setData('deduct_advance', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Deduct Advance
                                    </span>
                                </label>
                                {data.deduct_advance && (
                                    <input
                                        type="text"
                                        placeholder="Search bill..."
                                        onClick={() => setAdvanceSearchOpen(true)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                        readOnly
                                    />
                                )}
                            </div>

                            {/* Balance Due */}
                            <div className="mb-6 p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Balance Due</p>
                                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                    {Number(balanceDue).toFixed(2)}
                                </p>
                            </div>

                            {/* Payment Method */}
                            <div className="mb-4">
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Payment
                                </p>
                                <div className="space-y-2">
                                    {['cash', 'card', 'split'].map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setData('payment_method', method)}
                                            className={`w-full px-3 py-2 rounded-lg font-medium text-sm transition-colors ${data.payment_method === method
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {method === 'split' ? 'Split Payment' : method.charAt(0).toUpperCase() + method.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                {data.payment_method === 'card' && (
                                    <input
                                        type="text"
                                        placeholder="Card reference (last 4 digits)"
                                        value={data.card_reference}
                                        onChange={e => setData('card_reference', e.target.value)}
                                        className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                    />
                                )}
                            </div>

                            {/* Save Button */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full px-4 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Bill'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

        </MainLayout>
    );
}
