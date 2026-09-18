import { Link } from '@inertiajs/react';
import { useState } from 'react';

function formatCurrency(value) {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

import {
    ExternalLink, Trash2, UserPlus, Search, ShoppingBag,
    DollarSign, CreditCard, Building2, Wallet, ArrowDownCircle,
    ShieldCheck, User, PauseCircle, Clock, Tag, Download, MessageCircle,
} from 'lucide-react';
import { getCleanDescription } from '@/utils/format';
import CollapsibleSection from './CollapsibleSection';

export default function CartPanel({
    billNumber,
    billDate,
    customerName,
    customerPhone,
    customerSearch,
    customerOptions = [],
    selectedCustomer,
    selectedCustomerId,
    onBillDateChange,
    onCustomerNameChange,
    onCustomerPhoneChange,
    onCustomerSearchChange,
    onClearCustomer,
    onCustomerSelectById,
    items = [],
    onUpdateQuantity,
    onUpdateUnitPrice,
    onUpdateDiscountMode,
    onUpdateDiscountValue,
    onRemoveItem,
    onClearCart,
    subtotal,
    discountMode,
    discountValue,
    onDiscountModeChange,
    onDiscountValueChange,
    discountAmount,
    creationChargeTotal = 0,
    afterDiscount,
    advanceEnabled,
    onAdvanceEnabledChange,
    advanceBillNo,
    onAdvanceBillNoChange,
    advanceAmount,
    onAdvanceAmountChange,
    matchedAdvanceBill,
    paymentMethod,
    onPaymentMethodChange,
    advancePaymentMethod = 'cash',
    onAdvancePaymentMethodChange,
    referenceNumber,
    onReferenceNumberChange,
    bankName,
    onBankNameChange,
    frontOfficers = [],
    frontOfficerId,
    onFrontOfficerIdChange,
    promiseDate,
    onPromiseDateChange,
    customerRequired = false,
    errors = {},
    balanceDue,
    onSaveBill,
    saving = false,
    creatingCustomer = false,
    onCreateCustomer,
    viewCustomerProfileUrl = null,
    lastSavedBill = null,
    recentBills = [],
    invoiceSettings = {},
    shopInfo = {},
    onNewOrder = null,
    holdNote = '',
    onHoldNoteChange,
    onHoldOrder,
    heldOrdersCount = 0,
    onShowHeldOrders,
}) {
    const hasNonEmptyItems = items.some(item =>
        item.type === 'stock' || item.category_id || item.description || Number(item.unit_price || 0) > 0
    );
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);
    const [localCreateError, setLocalCreateError] = useState('');
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        customer_type: 'amateur',
    });

    // Collapsible section states
    const [customerOpen, setCustomerOpen] = useState(true);
    const [discountOpen, setDiscountOpen] = useState(false);
    const [advanceOpen, setAdvanceOpen] = useState(false);

    const handleCreateCustomer = async () => {
        if (!newCustomer.name.trim()) {
            setLocalCreateError('Customer name is required.');
            return;
        }

        setLocalCreateError('');

        const result = await onCreateCustomer?.({
            name: newCustomer.name.trim(),
            phone: newCustomer.phone.trim(),
            email: newCustomer.email.trim(),
            customer_type: newCustomer.customer_type,
        });

        if (result?.ok) {
            setShowCreateCustomer(false);
            setNewCustomer({
                name: '',
                phone: '',
                email: '',
                customer_type: 'amateur',
            });
            return;
        }

        setLocalCreateError(result?.error || 'Failed to create customer.');
    };

    const handleSavePDF = async () => {
        if (!lastSavedBill) return;
        const { generateThermalPDFFromBillData } = await import('@/utils/pdfGenerator');
        const doc = await generateThermalPDFFromBillData(lastSavedBill, { shopInfo, invoiceSettings });
        doc.save(`Receipt_${lastSavedBill.bill_number}.pdf`);
    };

    const handleWhatsApp = async () => {
        if (!lastSavedBill) return;
        const { generateThermalImageFromBillData, sharePDFOnWhatsApp, generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
        const blob = await generateThermalImageFromBillData(lastSavedBill, { shopInfo, invoiceSettings });
        const message = generateWhatsAppMessageForBill(lastSavedBill, { ...shopInfo, ...invoiceSettings });
        await sharePDFOnWhatsApp(blob, `Receipt_${lastSavedBill.bill_number}.jpg`, lastSavedBill.customer_phone || '', message);
    };

    const handleSaveA4PDF = async () => {
        if (!lastSavedBill) return;
        const { generatePDFFromBillData } = await import('@/utils/pdfGenerator');
        const cfg = { ...shopInfo, ...invoiceSettings };
        const doc = await generatePDFFromBillData(lastSavedBill, cfg);
        doc.save(`Invoice_${lastSavedBill.bill_number}.pdf`);
    };

    const handleWhatsAppA4 = async () => {
        if (!lastSavedBill) return;
        const { generatePDFFromBillData, sharePDFOnWhatsApp, generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
        const cfg = { ...shopInfo, ...invoiceSettings };
        const doc = await generatePDFFromBillData(lastSavedBill, cfg);
        const message = generateWhatsAppMessageForBill(lastSavedBill, cfg);
        await sharePDFOnWhatsApp(doc, `Invoice_${lastSavedBill.bill_number}.pdf`, lastSavedBill.customer_phone || '', message);
    };

    // Customer badge for collapsed state
    const customerBadge = selectedCustomer
        ? `✓ ${selectedCustomer.name}`
        : (customerName ? `⚠ ${customerName}` : null);

    // Discount badge for collapsed state
    const discountBadge = discountAmount > 0
        ? `−${formatCurrency(discountAmount)}`
        : null;

    // Advance badge for collapsed state
    const advanceBadge = advanceEnabled && matchedAdvanceBill
        ? matchedAdvanceBill.bill_number
        : (advanceEnabled ? 'Active' : null);

    return (
        <aside className="w-full flex flex-col h-full bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden">
            {/* ─── Header ─── */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Order Checkout</h2>
                    <div className="flex items-center gap-2">
                        {heldOrdersCount > 0 && (
                            <button
                                type="button"
                                onClick={onShowHeldOrders}
                                className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                            >
                                <Clock className="w-3 h-3" />
                                {heldOrdersCount}
                            </button>
                        )}
                        <span className="px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[10px] font-bold border border-primary-500/20 uppercase tracking-widest">
                            {billNumber}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Scrollable Content ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">

                {/* ══════ Section 1: Customer Details (Collapsible) ══════ */}
                <CollapsibleSection
                    icon={<User className="w-4 h-4" />}
                    title="Customer"
                    badge={customerBadge}
                    open={customerOpen}
                    onToggle={setCustomerOpen}
                >
                    <div className="space-y-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                list="pos-customer-options"
                                value={customerSearch}
                                onChange={(e) => onCustomerSearchChange(e.target.value)}
                                placeholder="Find or add customer..."
                                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${(errors.customerSelection || errors.customerName) ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'} bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all`}
                            />
                            <datalist id="pos-customer-options">
                                {customerOptions.map((customer) => (
                                    <option key={customer.id} value={customer.label} />
                                ))}
                            </datalist>
                        </div>

                        {paymentMethod === 'credit' && customerOptions.length > 0 && (
                            <select
                                value={selectedCustomerId || ''}
                                onChange={(event) => onCustomerSelectById?.(event.target.value)}
                                className={`w-full rounded-xl border ${(errors.customerSelection || errors.customerName) ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'} bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all`}
                            >
                                <option value="">Select credit customer</option>
                                {customerOptions.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {selectedCustomer ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{selectedCustomer.name}</p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{selectedCustomer.phone || 'No phone'}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {viewCustomerProfileUrl && (
                                        <Link href={viewCustomerProfileUrl} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    )}
                                    <button type="button" onClick={onClearCustomer} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {(customerName || customerPhone) && (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{customerName || 'Guest'}</p>
                                                <span className="text-[8px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded uppercase tracking-wider">Unsaved</span>
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">{customerPhone || 'No phone'}</p>
                                        </div>
                                        <button type="button" onClick={onClearCustomer} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowCreateCustomer((current) => !current)}
                                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-700/50 text-slate-400 text-[10px] font-bold hover:border-primary-500/30 hover:text-primary-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    New Customer
                                </button>
                            </>
                        )}

                        {showCreateCustomer && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50 space-y-2">
                                <input
                                    type="text"
                                    value={newCustomer.name}
                                    onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))}
                                    placeholder="Full Name *"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                />
                                <input
                                    type="text"
                                    value={newCustomer.phone}
                                    onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))}
                                    placeholder="Contact Number"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                />
                                <select
                                    value={newCustomer.customer_type}
                                    onChange={(event) => setNewCustomer((current) => ({ ...current, customer_type: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="amature">Amature</option>
                                    <option value="professional">Professional</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleCreateCustomer}
                                    disabled={creatingCustomer}
                                    className="w-full rounded-lg bg-slate-900 dark:bg-slate-700 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all uppercase tracking-widest"
                                >
                                    {creatingCustomer ? 'Processing...' : 'Add Account'}
                                </button>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* ══════ Section 2: Cart Items (Always visible) ══════ */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-slate-400" />
                            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cart</h3>
                            {hasNonEmptyItems && (
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                                    {items.length}
                                </span>
                            )}
                        </div>
                        {hasNonEmptyItems && (
                            <button
                                type="button"
                                onClick={onClearCart}
                                className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                        {items.length === 0 ? (
                            <div className="py-6 text-center bg-slate-50/50 dark:bg-slate-900/20">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Cart is empty</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[260px] overflow-y-auto scrollbar-thin">
                                {items.map((item) => (
                                    <div key={item.id} className="group flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors">
                                        {/* Description + unit price */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate leading-tight">
                                                {getCleanDescription(item.description, item.size || item.variant?.size)}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="text-[9px] text-slate-400">@</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unit_price}
                                                    onChange={(e) => onUpdateUnitPrice?.(item.id, e.target.value)}
                                                    onWheel={(e) => e.target.blur()}
                                                    className="w-16 px-1 py-0 text-[10px] font-bold bg-transparent text-slate-500 dark:text-slate-400 border-0 border-b border-transparent hover:border-slate-200 focus:border-primary-500 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            {Number(item.price_override_discount || 0) > 0 && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">Price adj.</span>
                                                    <span className="text-[9px] font-bold text-amber-500">−{formatCurrency(item.price_override_discount)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quantity stepper */}
                                        <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700/50 shrink-0">
                                            <button
                                                type="button"
                                                aria-label="Decrease quantity"
                                                onClick={() => {
                                                    const nextQty = Number(item.quantity || 0) - 1;
                                                    onUpdateQuantity(item.id, Math.max(0, nextQty));
                                                }}
                                                className="px-1.5 py-1 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.quantity}
                                                onChange={(e) => onUpdateQuantity(item.id, e.target.value)}
                                                onBlur={(e) => {
                                                    const val = Number(e.target.value || 0);
                                                    if (val < 0) onUpdateQuantity(item.id, 0);
                                                }}
                                                onWheel={(e) => e.target.blur()}
                                                className="w-8 text-center bg-transparent text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                type="button"
                                                aria-label="Increase quantity"
                                                onClick={() => onUpdateQuantity(item.id, Number(item.quantity || 0) + 1)}
                                                className="px-1.5 py-1 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Discount inline */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <div className="flex p-0.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50">
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateDiscountMode?.(item.id, 'amount')}
                                                    className={`px-1 py-0.5 rounded text-[8px] font-black transition-all ${item.discount_type === 'amount' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    LKR
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateDiscountMode?.(item.id, 'percent')}
                                                    className={`px-1 py-0.5 rounded text-[8px] font-black transition-all ${item.discount_type === 'percent' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    %
                                                </button>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.discount_value || ''}
                                                onChange={(e) => onUpdateDiscountValue?.(item.id, e.target.value)}
                                                onWheel={(e) => e.target.blur()}
                                                className="w-10 px-1 py-0.5 text-right text-[10px] font-bold bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="0"
                                            />
                                        </div>

                                        {/* Line total */}
                                        <span className="text-[11px] font-black text-slate-900 dark:text-white w-16 text-right shrink-0 tabular-nums">
                                            {formatCurrency(Number(item.line_total || 0))}
                                        </span>

                                        {/* Remove */}
                                        <button
                                            type="button"
                                            onClick={() => onRemoveItem(item.id)}
                                            aria-label="Remove item"
                                            className="p-1 rounded-md text-slate-300 hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══════ Section 3: Discount & Adjustments (Collapsible) ══════ */}
                <CollapsibleSection
                    icon={<Tag className="w-4 h-4" />}
                    title="Discount"
                    badge={discountBadge}
                    open={discountOpen}
                    onToggle={setDiscountOpen}
                >
                    <div className="space-y-3">
                        {/* Subtotal */}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(subtotal)}</span>
                        </div>

                        {/* Discount input */}
                        <div className="flex items-center gap-2">
                            <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50 shrink-0">
                                <button onClick={() => onDiscountModeChange('amount')} className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${discountMode === 'amount' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>LKR</button>
                                <button onClick={() => onDiscountModeChange('percent')} className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${discountMode === 'percent' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>%</button>
                            </div>
                            <input
                                type="number"
                                value={discountValue}
                                onChange={(e) => onDiscountValueChange(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                placeholder="0.00"
                            />
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-emerald-500 uppercase tracking-tight">
                                <span>Savings</span>
                                <span>− {formatCurrency(discountAmount)}</span>
                            </div>
                        )}

                        {Number(creationChargeTotal || 0) > 0 && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Creation Charges</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(creationChargeTotal)}</span>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* ══════ Section 4: Advance Claim (Collapsible) ══════ */}
                <CollapsibleSection
                    icon={<ShieldCheck className="w-4 h-4" />}
                    title="Advance Claim"
                    badge={advanceBadge}
                    open={advanceOpen}
                    onToggle={setAdvanceOpen}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enable</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={advanceEnabled} onChange={(e) => onAdvanceEnabledChange(e.target.checked)} />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500" />
                            </label>
                        </div>

                        {advanceEnabled && (
                            <div className="space-y-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={advanceBillNo}
                                        onChange={(e) => onAdvanceBillNoChange(e.target.value)}
                                        placeholder="Claim Bill ID or last 4 digits..."
                                        className="w-full px-3 py-2 rounded-lg border border-amber-500/20 bg-white text-xs font-bold text-amber-700 placeholder:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                    {advanceBillNo && advanceBillNo.length >= 2 && !matchedAdvanceBill && (
                                        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white dark:bg-slate-800 border border-amber-500/20 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                            {recentBills
                                                .filter(b => {
                                                    const search = advanceBillNo.toUpperCase();
                                                    const bNum = String(b.bill_number).toUpperCase();
                                                    return bNum.includes(search) || bNum.endsWith(search);
                                                })
                                                .slice(0, 5)
                                                .map(bill => (
                                                    <button
                                                        key={bill.id}
                                                        type="button"
                                                        onClick={() => onAdvanceBillNoChange(bill.bill_number)}
                                                        className="w-full px-3 py-2 text-left hover:bg-amber-500/10 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                                                    >
                                                        <div className="text-[11px] font-black text-amber-700 dark:text-amber-500">{bill.bill_number}</div>
                                                        <div className="flex justify-between items-center mt-0.5">
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{bill.customer_name || 'Walk-in'}</span>
                                                            <span className="text-[10px] font-black text-amber-600">LKR {formatCurrency(bill.paid_amount)}</span>
                                                        </div>
                                                    </button>
                                                ))
                                            }
                                            {recentBills.filter(b => {
                                                const search = advanceBillNo.toUpperCase();
                                                const bNum = String(b.bill_number).toUpperCase();
                                                return bNum.includes(search) || bNum.endsWith(search);
                                            }).length === 0 && (
                                                <div className="px-4 py-3 text-[10px] text-slate-400 font-bold text-center italic uppercase tracking-widest">
                                                    No matching bills found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400">LKR</span>
                                    <input
                                        type="number"
                                        value={advanceAmount}
                                        onChange={(e) => onAdvanceAmountChange(e.target.value)}
                                        className="w-full pl-11 pr-4 py-2 rounded-lg border border-amber-500/20 bg-white text-xs text-right font-black text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            </div>

            {/* ─── Sticky Bottom: Payment + Actions ─── */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
                <div className="px-5 py-4 space-y-4">
                    {lastSavedBill && (
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 animate-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                        Last Bill: {lastSavedBill.bill_number}
                                    </span>
                                </div>
                                <button
                                    onClick={onNewOrder}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Clear POS
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleSavePDF}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Save PDF
                                </button>
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    WhatsApp
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button
                                    onClick={handleSaveA4PDF}
                                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                                >
                                    <Download className="w-3 h-3" />
                                    Save A4 PDF
                                </button>
                                <button
                                    onClick={handleWhatsAppA4}
                                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[9px] font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/50 dark:border-slate-700/50"
                                >
                                    <MessageCircle className="w-3 h-3" />
                                    WhatsApp A4
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Total Payable */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Payable</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(balanceDue)}</span>
                    </div>

                    {/* Payment Method — Compact pill selector */}
                    <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 gap-0.5">
                        {['cash', 'card', 'bank_transfer', 'credit', 'advance'].map((method) => {
                            const icons = {
                                cash: <DollarSign className="w-3.5 h-3.5" />,
                                card: <CreditCard className="w-3.5 h-3.5" />,
                                bank_transfer: <Building2 className="w-3.5 h-3.5" />,
                                credit: <Wallet className="w-3.5 h-3.5" />,
                                advance: <ArrowDownCircle className="w-3.5 h-3.5" />,
                            };
                            const labels = {
                                cash: 'Cash',
                                card: 'Card',
                                bank_transfer: 'Bank',
                                credit: 'Credit',
                                advance: 'Adv',
                            };
                            return (
                                <button
                                    key={method}
                                    onClick={() => onPaymentMethodChange(method)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-all text-[9px] font-bold uppercase tracking-tight ${paymentMethod === method
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {icons[method]}
                                    <span className="hidden sm:inline">{labels[method]}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Conditional: Bank Transfer fields */}
                    {paymentMethod === 'bank_transfer' && (
                        <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                            <input
                                type="text"
                                value={referenceNumber || ''}
                                onChange={(event) => onReferenceNumberChange?.(event.target.value)}
                                placeholder="Reference #"
                                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                            <input
                                type="text"
                                value={bankName || ''}
                                onChange={(event) => onBankNameChange?.(event.target.value)}
                                placeholder="Bank"
                                className="w-28 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                    )}

                    {/* Conditional: Credit / Advance sub-fields */}
                    {(paymentMethod === 'credit' || paymentMethod === 'advance') && (
                        <div className="space-y-2 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 animate-in slide-in-from-top-1 duration-200">
                            {paymentMethod === 'advance' && (
                                <>
                                    <div className="flex gap-1 p-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        {[
                                            { id: 'cash', label: 'Cash', icon: <DollarSign className="w-3 h-3" /> },
                                            { id: 'bank_transfer', label: 'Online', icon: <Building2 className="w-3 h-3" /> },
                                            { id: 'card', label: 'Card', icon: <CreditCard className="w-3 h-3" /> }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => onAdvancePaymentMethodChange?.(opt.id)}
                                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${advancePaymentMethod === opt.id
                                                    ? 'bg-amber-600 text-white shadow-sm'
                                                    : 'text-amber-800 dark:text-amber-400 hover:bg-amber-500/20'
                                                }`}
                                            >
                                                {opt.icon}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600 dark:text-amber-400">LKR</span>
                                        <input
                                            type="number"
                                            value={advanceAmount || ''}
                                            onChange={(event) => onAdvanceAmountChange?.(event.target.value)}
                                            placeholder="Advance amount"
                                            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.advanceAmount ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'} bg-white dark:bg-slate-800 text-right text-sm font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                                        />
                                        {errors.advanceAmount && (
                                            <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-1">{errors.advanceAmount}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            <select
                                value={frontOfficerId || ''}
                                onChange={(event) => onFrontOfficerIdChange?.(event.target.value)}
                                className={`w-full rounded-lg border ${errors.frontOfficerId ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'} bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                            >
                                <option value="">Select front officer</option>
                                {frontOfficers.map((officer) => (
                                    <option key={officer.id} value={officer.id}>
                                        {officer.name}
                                    </option>
                                ))}
                            </select>
                            {errors.frontOfficerId && (
                                <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{errors.frontOfficerId}</p>
                            )}

                            <input
                                type="date"
                                value={promiseDate || ''}
                                onChange={(event) => onPromiseDateChange?.(event.target.value)}
                                className={`w-full rounded-lg border ${errors.promiseDate ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'} bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                            />
                            {errors.promiseDate && (
                                <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{errors.promiseDate}</p>
                            )}
                        </div>
                    )}

                    {/* Hold Note */}
                    <input
                        type="text"
                        value={holdNote}
                        onChange={(e) => onHoldNoteChange?.(e.target.value)}
                        placeholder="Hold note (optional)..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500"
                    />

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onHoldOrder}
                            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest text-[10px] transition-all border border-amber-500/20 hover:border-amber-500/40 active:scale-95"
                            title="Hold Order"
                        >
                            <PauseCircle className="w-4 h-4" />
                            Hold
                        </button>
                        <button
                            type="button"
                            onClick={onSaveBill}
                            disabled={saving}
                            className="flex-1 group relative flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-primary-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className="relative z-10">{saving ? 'Finalizing...' : 'Commit Transaction'}</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
