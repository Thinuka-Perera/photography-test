import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { Printer, Eye, CheckCircle2, PencilLine, Plus, ReceiptText, BarChart3, AlertCircle, MessageCircle, Download, Clock, Barcode, Keyboard } from 'lucide-react';
import Modal from '@/Components/Modal';
import ManualEntryTab from '@/Components/POS/ManualEntryTab';
import CartPanel from '@/Components/POS/CartPanel';
import EditorCreationChargesPanel from '@/Components/POS/EditorCreationChargesPanel';
import BillPrintA4 from '@/Components/POS/BillPrintA4';
import BillPrintThermal from '@/Components/Bills/BillPrintThermal';
import BillPrintClientFormat from '@/Components/Bills/BillPrintClientFormat';
import BillPrintArachchiTemplate from '@/Components/Bills/BillPrintArachchiTemplate';
import HeldOrdersModal from '@/Components/POS/HeldOrdersModal';
import StockTab from '@/Components/POS/StockTab';
import PackagesTab from '@/Components/POS/PackagesTab';
import QuickActionToolbar from "@/Components/POS/QuickActionToolbar";

function makeManualRow(billCategories = []) {
    return {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category_id: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        autoFilled: false,
        discount_type: 'amount',
        discount_value: 0,
    };
}

function money(value) {
    return Number.parseFloat(Number(value || 0).toFixed(2));
}

function formatDateInput(date) {
    return date.toISOString().slice(0, 10);
}

function findBillByNumber(recentBills = [], billNumber = '') {
    const normalized = billNumber.trim().toUpperCase();
    if (!normalized) return null;

    // Check for exact match OR match with the end of the bill number (e.g. "0015" matches "BILL-...0015")
    return recentBills.find((bill) => {
        const bNum = String(bill.bill_number).toUpperCase();
        return bNum === normalized || bNum.endsWith(normalized);
    }) ?? null;
}

function stripPosRedirectQueryParams() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;
    ['saved_bill', 'completed_bill', 'print'].forEach((key) => {
        if (url.searchParams.has(key)) {
            url.searchParams.delete(key);
            changed = true;
        }
    });
    if (changed) {
        const next = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, '', next);
    }
}

async function fetchSavedBillPayload(billId) {
    const response = await window.axios.get(route('studio.bills.pos-flash', billId));
    return response?.data?.bill ?? null;
}

function extractSavedBillIdFromUrl(url) {
    if (!url) return null;
    const match = String(url).match(/[?&]saved_bill=(\d+)/);
    return match ? match[1] : null;
}

async function commitPosBill(payload) {
    const response = await window.axios.post(route('studio.pos.commit'), payload, {
        headers: { Accept: 'application/json' },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
    });

    const { data, headers } = response;

    if (data?.bill) {
        return { bill: data.bill, message: data.message || 'Bill saved successfully.' };
    }

    const billId = data?.bill_id
        ?? extractSavedBillIdFromUrl(headers?.location)
        ?? extractSavedBillIdFromUrl(response.request?.responseURL);

    if (billId) {
        const bill = await fetchSavedBillPayload(billId);
        if (bill) {
            return { bill, message: data?.message || 'Bill saved successfully.' };
        }
    }

    throw new Error(data?.message || 'Missing bill payload in server response.');
}

function ShortcutRow({ keys, label }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/35 last:border-b-0">
            <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs">{label}</span>
            <div className="flex gap-1.5">
                {keys.map((k) => (
                    <kbd key={k} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100 shadow-md">
                        {k}
                    </kbd>
                ))}
            </div>
        </div>
    );
}

export default function POSIndex({
    products = [],
    categories = [],
    packages = [],
    itemTypes = [],
    editors = [],
    dealers = [],
    frontOfficers = [],
    customers = [],
    recentBills = [],
    manualInvoices = [],
    nextBillNo = '',
    invoiceSettings = {},
    shopInfo: shopInfoProp = null,
    flashedSavedBill = null,
}) {
    const { flash, auth, shopSettings, canSetCommission, activeShop = null } = usePage().props;

    const shopInfo = useMemo(() => {
        const active = activeShop ?? {};
        const pick = (...values) => {
            for (const value of values) {
                if (value == null) continue;
                const text = String(value).trim();
                if (text !== '') return text;
            }
            return '';
        };

        const merged = { ...(shopSettings || {}), ...(shopInfoProp || {}) };

        return {
            ...merged,
            shop_name: pick(active.shop_name, active.name, shopInfoProp?.shop_name, shopSettings?.shop_name) || 'Shop',
            phone: pick(active.phone, active.shop_phone, shopInfoProp?.shop_phone, shopInfoProp?.phone, shopSettings?.shop_phone, shopSettings?.phone),
            email: pick(shopInfoProp?.email, shopSettings?.shop_email, shopSettings?.email),
            address: pick(active.shop_address, active.address, shopInfoProp?.shop_address, shopInfoProp?.address, shopSettings?.shop_address, shopSettings?.address),
            shop_address: pick(active.shop_address, active.address, shopInfoProp?.shop_address, shopInfoProp?.address, shopSettings?.shop_address, shopSettings?.address),
            shop_whatsapp: pick(active.shop_whatsapp, shopInfoProp?.shop_whatsapp, shopSettings?.shop_whatsapp),
            shop_hotline: pick(active.shop_hotline, active.phone, shopInfoProp?.shop_hotline, shopSettings?.shop_hotline, shopSettings?.shop_phone),
            shop_phone: pick(active.shop_phone, active.phone, shopInfoProp?.shop_phone, shopSettings?.shop_phone),
            shop_logo: active.shop_logo ?? shopInfoProp?.shop_logo ?? shopSettings?.shop_logo ?? null,
            shop_logo_url: active.shop_logo_url ?? shopInfoProp?.shop_logo_url ?? shopSettings?.shop_logo_url ?? null,
            invoice_template: pick(shopInfoProp?.invoice_template, shopSettings?.invoice_template) || 'default',
            invoice_payment_info: pick(shopInfoProp?.invoice_payment_info, shopInfoProp?.payment_info, shopInfoProp?.paymentInfo, shopSettings?.invoice_payment_info, shopSettings?.payment_info, shopSettings?.paymentInfo),
            payment_info: pick(shopInfoProp?.payment_info, shopInfoProp?.invoice_payment_info, shopSettings?.payment_info, shopSettings?.invoice_payment_info),
            paymentInfo: pick(shopInfoProp?.paymentInfo, shopInfoProp?.invoice_payment_info, shopSettings?.paymentInfo, shopSettings?.invoice_payment_info),
            bank_account_no: pick(shopInfoProp?.bank_account_no, shopInfoProp?.bankAccount, shopSettings?.bank_account_no, shopSettings?.bankAccount),
            bankAccount: pick(shopInfoProp?.bank_account_no, shopInfoProp?.bankAccount, shopSettings?.bank_account_no, shopSettings?.bankAccount),
            account_name: pick(shopInfoProp?.account_name, shopInfoProp?.accountName, shopSettings?.account_name, shopSettings?.accountName),
            accountName: pick(shopInfoProp?.account_name, shopInfoProp?.accountName, shopSettings?.account_name, shopSettings?.accountName),
            bank_details: pick(shopInfoProp?.bank_details, shopInfoProp?.bankDetails, shopSettings?.bank_details, shopSettings?.bankDetails),
            bankDetails: pick(shopInfoProp?.bank_details, shopInfoProp?.bankDetails, shopSettings?.bank_details, shopSettings?.bankDetails),
            invoice_terms: pick(shopInfoProp?.invoice_terms, shopSettings?.invoice_terms),
            termsConditions: pick(shopInfoProp?.termsConditions, shopInfoProp?.invoice_terms, shopSettings?.termsConditions, shopSettings?.invoice_terms),
            invoice_note: pick(shopInfoProp?.invoice_note, shopSettings?.invoice_note),
        };
    }, [shopSettings, shopInfoProp, activeShop]);

    const [activeTabId, setActiveTabId] = useState('inventory');
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [manualRows, setManualRows] = useState(() => [makeManualRow(itemTypes)]);
    const [activeInvoiceId, setActiveInvoiceId] = useState(null);
    const loadedInvoice = useMemo(() => {
        return (manualInvoices || []).find((inv) => inv.id === activeInvoiceId);
    }, [manualInvoices, activeInvoiceId]);
    const [stockRows, setStockRows] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const barcodeInputRef = useRef(null);
    const productSearchInputRef = useRef(null);
    const lastScanTimeRef = useRef(0);
    const lastScanCodeRef = useRef('');
    const [productSearchFocusTrigger, setProductSearchFocusTrigger] = useState(0);

    const playFeedbackSound = (isSuccess) => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            const audioCtx = new AudioContextClass();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (isSuccess) {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.08);
            } else {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.25);
            }
        } catch (e) {
            console.warn('Audio feedback blocked/not supported:', e);
        }
    };

    const focusScannerInput = useCallback(() => {
        if (!barcodeInputRef.current) return;
        const active = document.activeElement;
        if (active) {
            const tagName = active.tagName.toLowerCase();
            const type = active.getAttribute('type');

            const isEditingOther = (
                tagName === 'textarea' ||
                tagName === 'select' ||
                (tagName === 'input' &&
                    type !== 'button' &&
                    type !== 'submit' &&
                    type !== 'checkbox' &&
                    type !== 'radio' &&
                    active !== barcodeInputRef.current)
            );
            if (isEditingOther) {
                return;
            }
        }
        barcodeInputRef.current.focus();
    }, []);

    const [billDate, setBillDate] = useState(() => formatDateInput(new Date()));
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerList, setCustomerList] = useState(customers);
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [discountMode, setDiscountMode] = useState('amount');
    const [discountValue, setDiscountValue] = useState(0);
    const [advanceEnabled, setAdvanceEnabled] = useState(false);
    const [advanceBillNo, setAdvanceBillNo] = useState('');
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [selectedEditorId, setSelectedEditorId] = useState('');
    const [commissionPct, setCommissionPct] = useState('');
    const [applyCommission, setApplyCommission] = useState(true);
    const [selectedDealerId, setSelectedDealerId] = useState('');
    const [dealerCommissionPct, setDealerCommissionPct] = useState('');
    const [applyDealerCommission, setApplyDealerCommission] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [advancePaymentMethod, setAdvancePaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [frontOfficerId, setFrontOfficerId] = useState('');
    const [promiseDate, setPromiseDate] = useState('');
    const [savedBill, setSavedBill] = useState(null);
    const [printMode, setPrintMode] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [changeQtyTrigger, setChangeQtyTrigger] = useState(0);
    const [changeRateTrigger, setChangeRateTrigger] = useState(0);
    const [findItemTrigger, setFindItemTrigger] = useState(0);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const [creationCharges, setCreationCharges] = useState([
        { id: `creation-${Date.now()}`, label: 'Creation charge', amount: 0 },
    ]);
    const [dealerCommissions, setDealerCommissions] = useState([
        { id: `dealer-commission-${Date.now()}`, label: 'Referral commission', amount: 0, dealer_id: null },
    ]);
    const [completedBillId, setCompletedBillId] = useState(null);
    const [lastSavedBill, setLastSavedBill] = useState(null);
    const [holdNote, setHoldNote] = useState('');
    const [selectedPackageForModal, setSelectedPackageForModal] = useState(null);
    const [selectedPackageProducts, setSelectedPackageProducts] = useState([]);
    const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
    const [selectedProductGroup, setSelectedProductGroup] = useState(null);
    const [heldOrders, setHeldOrders] = useState(() => {
        try {
            const saved = localStorage.getItem('pos_held_orders');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const matchedAdvanceBill = useMemo(
        () => findBillByNumber(recentBills, advanceBillNo),
        [recentBills, advanceBillNo],
    );

    const customerOptions = useMemo(
        () => customerList.map((customer) => ({
            ...customer,
            label: customer.phone
                ? `${customer.name} (${customer.phone})`
                : customer.name,
        })),
        [customerList],
    );

    const selectedCustomer = useMemo(
        () => customerOptions.find((customer) => String(customer.id) === String(selectedCustomerId)) ?? null,
        [customerOptions, selectedCustomerId],
    );

    const creationChargeTotal = useMemo(
        () => creationCharges.reduce((total, charge) => total + Number(charge.amount || 0), 0),
        [creationCharges],
    );

    const dealerCommissionTotal = useMemo(
        () => dealerCommissions.reduce((total, item) => total + Number(item.amount || 0), 0),
        [dealerCommissions],
    );

    const applySavedBillFlash = useCallback((bill, successText) => {
        if (!bill) return;
        setSavedBill(bill);
        setLastSavedBill(bill);
        setPrintMode(null);
        setSaving(false);
        setStatusMessage({
            type: 'success',
            text: successText || `Bill ${bill.bill_number} saved successfully.`,
        });
    }, []);

    useEffect(() => {
        if (flashedSavedBill) {
            applySavedBillFlash(flashedSavedBill, flash?.success);
            stripPosRedirectQueryParams();
        }
    }, [flashedSavedBill, flash?.success, applySavedBillFlash]);

    useEffect(() => {
        if (flash?.saved_bill) {
            applySavedBillFlash(flash.saved_bill, flash?.success);
        }
    }, [flash?.saved_bill, flash?.success, applySavedBillFlash]);

    useEffect(() => {
        if (flash?.success && !flashedSavedBill && !flash?.saved_bill) {
            setSaving(false);
            setStatusMessage({ type: 'success', text: flash.success });
        }
    }, [flash?.success, flashedSavedBill, flash?.saved_bill]);

    useEffect(() => {
        if (flash?.error) {
            setStatusMessage({ type: 'error', text: flash.error });
            setSaving(false);
        }
    }, [flash?.error]);

    useEffect(() => {
        if (statusMessage.text) {
            const delay = statusMessage.type === 'error' ? 2500 : 3000;
            const timer = setTimeout(() => {
                setStatusMessage({ type: '', text: '' });
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    useEffect(() => {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const completedId = flash?.completed_bill_id ?? params?.get('completed_bill');
        const printType = flash?.completed_print_type ?? params?.get('print') ?? 'none';

        if (!completedId || !savedBill) {
            return;
        }

        if (String(completedId) !== String(savedBill.id)) {
            return;
        }

        setCompletedBillId(completedId);
        setLastSavedBill(savedBill);
        setPrintMode(printType === 'thermal' ? 'thermal' : (printType === 'a4' ? 'a4' : null));
        setSaving(false);
        stripPosRedirectQueryParams();
    }, [flash?.completed_bill_id, flash?.completed_print_type, savedBill]);

    useEffect(() => {
        setCustomerList(customers);
    }, [customers]);

    useEffect(() => {
        if (activeTabId === 'manual' && manualRows.length === 0) {
            setManualRows([makeManualRow(itemTypes)]);
        }
    }, [activeTabId, manualRows.length, itemTypes]);

    const addPackageToCart = (pkg) => {
        if (pkg.products && pkg.products.length > 0) {
            setSelectedPackageForModal(pkg);
            setSelectedPackageProducts(pkg.products.map(p => ({
                variant_id: p.variant_id,
                quantity: p.quantity ?? 1,
                is_optional: p.is_optional ?? true,
                is_selected: !p.is_optional,
                charge_type: 'free',
            })));
        } else {
            addPackageToCartDirectly(pkg, []);
        }
    };

    const addPackageToCartDirectly = (pkg, selectedProdList = []) => {
        setManualRows((current) => {
            const isEmptyRowOnly = current.length === 1 && !current[0].category_id && !current[0].description && Number(current[0].unit_price || 0) === 0;

            const newRow = {
                id: `package-${pkg.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                category_id: '',
                description: `${pkg.name} (Package)`,
                quantity: 1,
                unit_price: Number(pkg.total_price || 0),
                autoFilled: true
            };

            if (isEmptyRowOnly) {
                return [newRow];
            }

            return [...current, newRow];
        });

        selectedProdList.forEach((sp) => {
            const productInfo = products.find(p => p.id === sp.variant_id);
            if (productInfo) {
                const stockItemId = productInfo.stock_item_id ?? productInfo.id;
                const unitPrice = sp.charge_type === 'free' ? 0 : Number(productInfo.price || 0);

                setStockRows((current) => {
                    const existing = current.find((row) => String(row.stock_item_id) === String(stockItemId) && Number(row.unit_price) === unitPrice);
                    if (existing) {
                        return current.map((row) => (
                            String(row.stock_item_id) === String(stockItemId) && Number(row.unit_price) === unitPrice
                                ? { ...row, quantity: Number(row.quantity || 0) + sp.quantity }
                                : row
                        ));
                    }

                    return [
                        ...current,
                        {
                            id: `stock-${stockItemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            description: `${productInfo.name} (${productInfo.sku})`,
                            quantity: sp.quantity,
                            unit_price: unitPrice,
                            original_unit_price: unitPrice,
                            stock_item_id: stockItemId,
                            pos_tab_id: null,
                            stock: Number(productInfo.stock || 0),
                            sku: productInfo.sku ?? null,
                            size: productInfo.size ?? null,
                        },
                    ];
                });
            }
        });

        setStatusMessage({
            type: 'success',
            text: `Added package "${pkg.name}" to cart.`
        });
    };

    const toggleModalProductSelection = (variantId) => {
        setSelectedPackageProducts(prev => prev.map(p =>
            p.variant_id === variantId && p.is_optional
                ? { ...p, is_selected: !p.is_selected }
                : p
        ));
    };

    const toggleModalProductChargeType = (variantId, newType) => {
        setSelectedPackageProducts(prev => prev.map(p =>
            p.variant_id === variantId
                ? { ...p, charge_type: newType }
                : p
        ));
    };

    const cleanCodeForMatch = (val) => {
        if (!val) return '';
        return String(val)
            .replace(/[\s\-_]/g, '')
            .replace(/[\r\n\t]/g, '')
            .replace(/[^\x20-\x7E]/g, '')
            .toLowerCase()
            .trim();
    };

    const handleBarcodeScanned = (barcodeText) => {
        if (!barcodeText) return;
        const textToMatch = cleanCodeForMatch(barcodeText);

        let match = products.find((p) => p.barcode && cleanCodeForMatch(p.barcode) === textToMatch);
        if (!match) {
            match = products.find((p) => p.sku && cleanCodeForMatch(p.sku) === textToMatch);
        }

        if (match) {
            const added = addStockItem(match);
            if (added) {
                playFeedbackSound(true);
                setStatusMessage({
                    type: 'success',
                    text: `Successfully scanned and added: "${match.name}" (${match.sku ?? 'SKU'})`
                });
                setErrors(prev => ({ ...prev, cart: null }));
            }
        } else {
            playFeedbackSound(false);
            setStatusMessage({
                type: 'error',
                text: `Product not found.\nBarcode: ${barcodeText}`
            });
        }
    };

    const processBarcode = (rawCode) => {
        if (!rawCode) return;
        const cleaned = rawCode
            .replace(/[\r\n\t]/g, '')
            .replace(/[^\x20-\x7E]/g, '')
            .trim();

        if (!cleaned) return;

        const now = Date.now();
        if (now - lastScanTimeRef.current < 150 && lastScanCodeRef.current === cleaned) {
            return;
        }
        lastScanTimeRef.current = now;
        lastScanCodeRef.current = cleaned;

        handleBarcodeScanned(cleaned);
    };

    const handleBarcodeSearchSubmit = (e) => {
        e?.preventDefault();
        const code = barcodeInput;
        setBarcodeInput('');
        if (barcodeInputRef.current) {
            barcodeInputRef.current.value = '';
        }
        if (code && code.trim()) {
            processBarcode(code);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const code = e.target.value;
            e.target.value = '';
            setBarcodeInput('');
            if (code && code.trim()) {
                processBarcode(code);
            }
        }
    };

    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            const activeType = document.activeElement ? document.activeElement.getAttribute('type') : '';

            const isTyping = activeTag === 'textarea' || (activeTag === 'input' && (
                activeType === 'text' || activeType === 'number' || activeType === 'search' || activeType === 'email' || activeType === 'tel'
            ));

            if (document.activeElement === barcodeInputRef.current) {
                buffer = '';
                return;
            }

            const currentTime = Date.now();

            if (e.key === 'Enter') {
                if (buffer.length >= 3) {
                    const isFast = (currentTime - lastKeyTime < 100);
                    if (isFast) {
                        e.preventDefault();
                        e.stopPropagation();
                        const code = buffer.trim();
                        buffer = '';
                        processBarcode(code);
                        return;
                    }
                }
                buffer = '';
                return;
            }

            if (currentTime - lastKeyTime > 60) {
                if (isTyping) {
                    buffer = '';
                } else {
                    buffer = e.key;
                }
            } else {
                if (e.key.length === 1) {
                    buffer += e.key;
                }
            }
            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [products]);

    useEffect(() => {
        if (!selectedEditorId) {
            setCommissionPct('');
            setApplyCommission(false);
            return;
        }

        const selectedEditor = editors.find((editor) => String(editor.id) === String(selectedEditorId));
        const defaultPct = selectedEditor?.default_commission_pct != null
            ? Number(selectedEditor.default_commission_pct)
            : 0;
        setCommissionPct(defaultPct);
        setApplyCommission(true);
    }, [selectedEditorId, editors]);

    useEffect(() => {
        if (!selectedDealerId) {
            setDealerCommissionPct('');
            setApplyDealerCommission(false);
            return;
        }

        const selectedDealer = dealers.find((dealer) => String(dealer.id) === String(selectedDealerId));
        const defaultPct = selectedDealer?.default_commission_pct != null
            ? Number(selectedDealer.default_commission_pct)
            : 0;

        setDealerCommissionPct(defaultPct);
        setApplyDealerCommission(true);
    }, [selectedDealerId, dealers]);

    useEffect(() => {
        if (advanceEnabled && matchedAdvanceBill) {
            // For settling an advance: calculate remaining balance to collect
            const remainingBalance = Number(matchedAdvanceBill.balance_due ?? 0);
            setAdvanceAmount(remainingBalance);

            // Auto-fill customer details from matched bill
            setCustomerName(matchedAdvanceBill.customer_name || '');
            setCustomerPhone(matchedAdvanceBill.customer_phone || '');
            setSelectedCustomerId(matchedAdvanceBill.customer_id ? String(matchedAdvanceBill.customer_id) : '');

            if (matchedAdvanceBill.customer_name || matchedAdvanceBill.customer_phone) {
                setCustomerSearch(matchedAdvanceBill.customer_name || matchedAdvanceBill.customer_phone);
            }

            // Auto-fill items from matched advance bill
            if (matchedAdvanceBill.items && matchedAdvanceBill.items.length > 0) {
                const newRows = matchedAdvanceBill.items.map(item => ({
                    id: `manual-ref-${item.id}-${Date.now()}`,
                    category_id: item.category_id || '',
                    description: item.description || '',
                    quantity: Number(item.quantity || 1),
                    unit_price: Number(item.unit_price || 0),
                    autoFilled: false,
                }));
                setManualRows(newRows);
            }

            // Auto-fill creation charge if available
            if (matchedAdvanceBill.creation_charge > 0) {
                setCreationCharges([
                    { id: `creation-ref-${Date.now()}`, label: 'Original Creation charge', amount: Number(matchedAdvanceBill.creation_charge) }
                ]);
            }

            // Auto-fill editor and commission
            if (matchedAdvanceBill.editor_id) {
                setSelectedEditorId(String(matchedAdvanceBill.editor_id));
                if (matchedAdvanceBill.commission_pct) {
                    setCommissionPct(matchedAdvanceBill.commission_pct);
                }
            }

            // Auto-fill dealer and commission
            if (matchedAdvanceBill.dealer_id) {
                setSelectedDealerId(String(matchedAdvanceBill.dealer_id));
                if (matchedAdvanceBill.dealer_commission_pct) {
                    setDealerCommissionPct(matchedAdvanceBill.dealer_commission_pct);
                }
            }
        }
    }, [advanceEnabled, matchedAdvanceBill]);

    const manualJobsCommissionable = useMemo(() => {
        return money(manualRows.reduce((sum, row) => {
            const line = Number(row.quantity || 0) * Number(row.unit_price || 0);
            if (row.category_id) {
                const category = itemTypes.find((cat) => String(cat.id) === String(row.category_id));
                if (category?.no_commission === true || category?.no_commission === 1) {
                    return sum;
                }
            }
            return sum + line;
        }, 0));
    }, [manualRows, itemTypes]);

    useEffect(() => {
        if (manualJobsCommissionable + Number(creationChargeTotal || 0) <= 0) {
            setApplyCommission(false);
        }
    }, [manualJobsCommissionable, creationChargeTotal]);

    useEffect(() => {
        const handleAfterPrint = () => setPrintMode(null);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    const commissionableAmount = useMemo(() => {
        // Commission is calculated ONLY based on creation charge
        return money(Number(creationChargeTotal || 0));
    }, [creationChargeTotal]);

    const commissionAmount = useMemo(() => {
        if (!selectedEditorId || !applyCommission) return 0;
        return money((Number(creationChargeTotal || 0) * Number(commissionPct || 0)) / 100);
    }, [applyCommission, commissionPct, creationChargeTotal, selectedEditorId]);

    const dealerCommissionableAmount = useMemo(() => {
        return Number(manualJobsCommissionable || 0);
    }, [manualJobsCommissionable]);

    const dealerCommissionAmount = useMemo(() => {
        if (!selectedDealerId || !applyDealerCommission) return 0;
        return money((Number(creationChargeTotal || 0) * Number(dealerCommissionPct || 0)) / 100);
    }, [applyDealerCommission, dealerCommissionPct, creationChargeTotal, selectedDealerId]);

    const combinedItems = useMemo(() => {
        const validManualRows = manualRows.filter(row => row.category_id || (row.description && row.description.trim() !== '') || Number(row.unit_price || 0) > 0);
        return [
            ...validManualRows.map((row) => {
                const qty = Number(row.quantity || 0);
                const price = Number(row.unit_price || 0);
                const discType = row.discount_type || 'amount';
                const discVal = Number(row.discount_value || 0);
                const lineRawTotal = qty * price;
                const lineDiscount = discType === 'percent' ? money((lineRawTotal * discVal) / 100) : money(discVal);
                const cappedDiscount = Math.min(lineDiscount, lineRawTotal);
                const lineTotal = money(Math.max(0, lineRawTotal - cappedDiscount));

                return {
                    ...row,
                    type: 'manual',
                    is_stock_item: false,
                    pos_tab_id: null,
                    stock_item_id: null,
                    category_id: row.category_id || null,
                    quantity: qty,
                    unit_price: price,
                    effective_base_price: price,
                    discount_type: discType,
                    discount_value: discVal,
                    discount_amount: cappedDiscount,
                    line_total: lineTotal,
                };
            }),
            ...stockRows.map((row) => {
                const qty = Number(row.quantity || 0);
                const sellingPrice = Number(row.unit_price || 0);
                const originalPrice = Number(row.original_unit_price || sellingPrice);

                const effectiveBasePrice = Math.max(originalPrice, sellingPrice);
                const priceOverridePerUnit = Math.max(0, originalPrice - sellingPrice);
                const priceOverrideDiscount = priceOverridePerUnit * qty;

                const discType = row.discount_type || 'amount';
                const discVal = Number(row.discount_value || 0);
                const lineRawTotal = qty * effectiveBasePrice;
                const lineDiscount = discType === 'percent' ? money((lineRawTotal * discVal) / 100) : money(discVal);
                const cappedDiscount = Math.min(lineDiscount, lineRawTotal);
                const lineTotal = money(Math.max(0, lineRawTotal - cappedDiscount - priceOverrideDiscount));

                return {
                    ...row,
                    type: 'stock',
                    is_stock_item: true,
                    quantity: qty,
                    unit_price: sellingPrice,
                    original_unit_price: originalPrice,
                    effective_base_price: effectiveBasePrice,
                    price_override_discount: priceOverrideDiscount,
                    discount_type: discType,
                    discount_value: discVal,
                    discount_amount: cappedDiscount,
                    line_total: lineTotal,
                };
            }),
        ];
    }, [manualRows, stockRows]);

    useEffect(() => {
        focusScannerInput();
    }, [focusScannerInput]);

    useEffect(() => {
        focusScannerInput();
    }, [statusMessage, errors, focusScannerInput]);

    // useEffect(() => {
    //     const handleWindowClick = () => {
    //         setTimeout(focusScannerInput, 50);
    //     };
    //     window.addEventListener('click', handleWindowClick);
    //     return () => window.removeEventListener('click', handleWindowClick);
    // }, [focusScannerInput]);

    const subtotal = useMemo(() => {
        return money(combinedItems.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.effective_base_price || item.original_unit_price || item.unit_price || 0), 0));
    }, [combinedItems]);

    const totalLineDiscount = useMemo(() => {
        return money(combinedItems.reduce((total, item) => total + Number(item.discount_amount || 0) + Number(item.price_override_discount || 0), 0));
    }, [combinedItems]);

    const cartDiscountAmount = useMemo(() => {
        const value = Number(discountValue || 0);
        const base = Math.max(0, subtotal - totalLineDiscount);
        if (discountMode === 'percent') {
            return money((base * value) / 100);
        }
        return money(value);
    }, [discountMode, discountValue, subtotal, totalLineDiscount]);

    const discountAmount = useMemo(() => {
        return money(totalLineDiscount + cartDiscountAmount);
    }, [totalLineDiscount, cartDiscountAmount]);

    const afterDiscount = useMemo(
        () => money(Math.max(0, subtotal - discountAmount)),
        [subtotal, discountAmount],
    );

    const advanceAmountApplied = useMemo(() => {
        if (!advanceEnabled) return 0;
        // If settling an existing advance (matchedAdvanceBill exists), the full amount is the balance to collect
        if (matchedAdvanceBill) {
            return Number(advanceAmount || 0);
        }
        // If creating a new advance, it's limited by the total
        return money(Math.min(Number(advanceAmount || 0), afterDiscount));
    }, [advanceEnabled, advanceAmount, afterDiscount, matchedAdvanceBill]);

    const balanceDue = useMemo(() => {
        // If settling an advance, show the remaining balance to collect
        if (advanceEnabled && matchedAdvanceBill) {
            return money(Number(advanceAmount || 0));
        }
        // Otherwise, calculate normally
        return money(Math.max(0, afterDiscount - advanceAmountApplied));
    }, [advanceEnabled, matchedAdvanceBill, advanceAmount, afterDiscount, advanceAmountApplied]);

    const printWarning = combinedItems.length >= 12
        ? 'Bills with more than 12 items may not print cleanly on one page.'
        : null;

    const resetForm = () => {
        setManualRows([makeManualRow(itemTypes)]);
        setStockRows([]);
        setBillDate(formatDateInput(new Date()));
        setCustomerName('');
        setCustomerPhone('');
        setCustomerSearch('');
        setSelectedCustomerId('');
        setDiscountMode('amount');
        setDiscountValue(0);
        setAdvanceEnabled(false);
        setAdvanceBillNo('');
        setAdvanceAmount(0);
        setSelectedEditorId('');
        setCommissionPct('');
        setApplyCommission(true);
        setSelectedDealerId('');
        setDealerCommissionPct('');
        setApplyDealerCommission(true);
        setPaymentMethod('cash');
        setAdvancePaymentMethod('cash');
        setReferenceNumber('');
        setBankName('');
        setFrontOfficerId('');
        setPromiseDate('');
        setErrors({});
        setSavedBill(null);
        setCompletedBillId(null);
        setShowWhatsappModal(false);
        setWhatsappPhone('');
        setCreationCharges([
            { id: `creation-${Date.now()}`, label: 'Creation charge', amount: 0 },
        ]);
        setLastSavedBill(null);
        setHoldNote('');
        setActiveInvoiceId(null);
    };

    // ── Held Orders: localStorage persistence ──
    const persistHeldOrders = useCallback((orders) => {
        setHeldOrders(orders);
        try { localStorage.setItem('pos_held_orders', JSON.stringify(orders)); } catch { }
    }, []);

    const holdCurrentOrder = useCallback(() => {
        if (combinedItems.length === 0) {
            setStatusMessage({ type: 'error', text: 'Add at least one item before holding the order.' });
            return;
        }

        const holdSeq = (heldOrders.length > 0
            ? Math.max(...heldOrders.map(o => parseInt(String(o.holdRef).replace('HOLD-', ''), 10) || 0)) + 1
            : 1
        );

        const snapshot = {
            id: `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            holdRef: `HOLD-${String(holdSeq).padStart(3, '0')}`,
            heldAt: new Date().toISOString(),
            notes: holdNote || '',
            customerName,
            customerPhone,
            customerSearch,
            selectedCustomerId,
            manualRows,
            stockRows,
            billDate,
            discountMode,
            discountValue,
            advanceEnabled,
            advanceBillNo,
            advanceAmount,
            selectedEditorId,
            commissionPct,
            applyCommission,
            selectedDealerId,
            dealerCommissionPct,
            applyDealerCommission,
            paymentMethod,
            advancePaymentMethod,
            referenceNumber,
            bankName,
            frontOfficerId,
            promiseDate,
            creationCharges,
            subtotal,
            itemCount: combinedItems.length,
        };

        persistHeldOrders([snapshot, ...heldOrders]);
        resetForm();
        setStatusMessage({ type: 'success', text: `Order ${snapshot.holdRef} has been put on hold.` });
    }, [
        combinedItems, heldOrders, holdNote, customerName, customerPhone,
        customerSearch, selectedCustomerId, manualRows, stockRows, billDate,
        discountMode, discountValue, advanceEnabled, advanceBillNo, advanceAmount,
        selectedEditorId, commissionPct, applyCommission, paymentMethod,
        advancePaymentMethod, referenceNumber, bankName, frontOfficerId, promiseDate, creationCharges,
        subtotal, persistHeldOrders, resetForm,
    ]);

    const resumeHeldOrder = useCallback((holdId) => {
        const order = heldOrders.find(o => o.id === holdId);
        if (!order) return;

        // Restore all state from snapshot
        setManualRows(order.manualRows || [makeManualRow(itemTypes)]);
        setStockRows(order.stockRows || []);
        setBillDate(order.billDate || formatDateInput(new Date()));
        setCustomerName(order.customerName || '');
        setCustomerPhone(order.customerPhone || '');
        setCustomerSearch(order.customerSearch || '');
        setSelectedCustomerId(order.selectedCustomerId || '');
        setDiscountMode(order.discountMode || 'amount');
        setDiscountValue(order.discountValue || 0);
        setAdvanceEnabled(order.advanceEnabled || false);
        setAdvanceBillNo(order.advanceBillNo || '');
        setAdvanceAmount(order.advanceAmount || 0);
        setSelectedEditorId(order.selectedEditorId || '');
        setCommissionPct(order.commissionPct || '');
        setApplyCommission(order.applyCommission ?? true);
        setSelectedDealerId(order.selectedDealerId || '');
        setDealerCommissionPct(order.dealerCommissionPct || '');
        setApplyDealerCommission(order.applyDealerCommission ?? true);
        setPaymentMethod(order.paymentMethod || 'cash');
        setAdvancePaymentMethod(order.advancePaymentMethod || 'cash');
        setReferenceNumber(order.referenceNumber || '');
        setBankName(order.bankName || '');
        setFrontOfficerId(order.frontOfficerId || '');
        setPromiseDate(order.promiseDate || '');
        setCreationCharges(order.creationCharges || [{ id: `creation-${Date.now()}`, label: 'Creation charge', amount: 0 }]);
        setHoldNote(order.notes || '');
        setErrors({});
        setSavedBill(null);
        setCompletedBillId(null);
        setLastSavedBill(null);

        // Remove from held orders
        persistHeldOrders(heldOrders.filter(o => o.id !== holdId));
        setShowHeldOrdersModal(false);
        setStatusMessage({ type: 'success', text: `Order ${order.holdRef} resumed.` });
    }, [heldOrders, persistHeldOrders, itemTypes]);

    const deleteHeldOrder = useCallback((holdId) => {
        persistHeldOrders(heldOrders.filter(o => o.id !== holdId));
    }, [heldOrders, persistHeldOrders]);

    const deleteAllHeldOrders = useCallback(() => {
        persistHeldOrders([]);
    }, [persistHeldOrders]);

    const updateCreationCharge = (chargeId, field, value) => {
        setCreationCharges((current) => current.map((charge) => (
            charge.id === chargeId
                ? { ...charge, [field]: field === 'amount' ? Number(value || 0) : value }
                : charge
        )));
    };

    const addCreationChargeRow = () => {
        setCreationCharges((current) => ([
            ...current,
            { id: `creation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: 'Creation charge', amount: 0 },
        ]));
    };

    const removeCreationChargeRow = (chargeId) => {
        setCreationCharges((current) => {
            if (current.length <= 1) {
                return [{ id: `creation-${Date.now()}`, label: 'Creation charge', amount: 0 }];
            }

            return current.filter((charge) => charge.id !== chargeId);
        });
    };

    const updateDealerCommission = (commissionId, field, value) => {
        setDealerCommissions((current) => current.map((commission) => (
            commission.id === commissionId
                ? { ...commission, [field]: field === 'amount' ? Number(value || 0) : value }
                : commission
        )));
    };

    const addDealerCommissionRow = () => {
        setDealerCommissions((current) => ([
            ...current,
            { id: `dealer-commission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: 'Referral commission', amount: 0, dealer_id: null },
        ]));
    };

    const removeDealerCommissionRow = (commissionId) => {
        setDealerCommissions((current) => {
            if (current.length <= 1) {
                return [{ id: `dealer-commission-${Date.now()}`, label: 'Referral commission', amount: 0, dealer_id: null }];
            }

            return current.filter((commission) => commission.id !== commissionId);
        });
    };

    const addManualRow = () => {
        setManualRows((current) => [...current, makeManualRow(itemTypes)]);
    };

    const updateManualRow = (rowId, field, value) => {
        setManualRows((current) => current.map((row) => {
            if (row.id !== rowId) return row;

            if (field === 'description') {
                return { ...row, description: value, autoFilled: false };
            }

            if (field === 'category_id') {
                const selectedItemType = itemTypes.find((item) => String(item.id) === String(value));
                const shouldAutoFill = row.autoFilled || !row.description;
                return {
                    ...row,
                    category_id: value || '',
                    description: shouldAutoFill ? (selectedItemType?.default_description || '') : row.description,
                    autoFilled: shouldAutoFill && Boolean(selectedItemType?.default_description),
                };
            }

            return { ...row, [field]: value };
        }));
    };



    const removeManualRow = (rowId) => {
        setManualRows((current) => {
            if (current.length <= 1) {
                return [makeManualRow(itemTypes)];
            }
            return current.filter((row) => row.id !== rowId);
        });
    };

    const handleLoadInvoiceToCart = (invoice) => {
        const newManualRows = [];
        const newStockRows = [];

        (invoice.items || []).forEach((item) => {
            if (item.product_id) {
                const product = products.find(p => p.id === item.product_id || p.stock_item_id === item.product_id);
                const stock = product ? Number(product.stock || 0) : 0;
                const sku = product ? product.sku : (item.product_sku || null);

                newStockRows.push({
                    id: `stock-${item.product_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    description: item.description,
                    quantity: Number(item.quantity || 0),
                    unit_price: Number(item.unit_price || 0),
                    original_unit_price: Number(product?.price || item.unit_price || 0),
                    stock_item_id: item.product_id,
                    pos_tab_id: null,
                    stock: stock,
                    sku: sku,
                    size: item.size ?? product?.size ?? null,
                    discount_type: 'percent',
                    discount_value: Number(item.discount_pct || 0),
                });
            } else {
                newManualRows.push({
                    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    category_id: '',
                    description: item.description,
                    quantity: Number(item.quantity || 0),
                    unit_price: Number(item.unit_price || 0),
                    autoFilled: true,
                    discount_type: 'percent',
                    discount_value: Number(item.discount_pct || 0),
                });
            }
        });

        if (newManualRows.length === 0 && newStockRows.length === 0) {
            newManualRows.push(makeManualRow(itemTypes));
        }

        setManualRows(newManualRows);
        setStockRows(newStockRows);
        setActiveInvoiceId(invoice.id);

        setCustomerName(invoice.customer_name || '');
        setCustomerPhone(invoice.customer_phone || '');

        let foundCustomerId = invoice.customer_id;
        if (!foundCustomerId && (invoice.customer_name || invoice.customer_phone)) {
            const match = customerOptions.find((c) => {
                const phoneMatch = invoice.customer_phone && c.phone && String(c.phone).replace(/\D/g, '') === String(invoice.customer_phone).replace(/\D/g, '');
                const nameMatch = invoice.customer_name && c.name && String(c.name).toLowerCase().trim() === String(invoice.customer_name).toLowerCase().trim();
                return phoneMatch || nameMatch;
            });
            if (match) {
                foundCustomerId = match.id;
            }
        }

        if (foundCustomerId) {
            setSelectedCustomerId(String(foundCustomerId));
            const match = customerOptions.find((c) => String(c.id) === String(foundCustomerId));
            if (match) {
                setCustomerSearch(match.label || match.name || '');
                setCustomerName(match.name || '');
                setCustomerPhone(match.phone || '');
            }
        } else {
            setSelectedCustomerId('');
            setCustomerSearch(invoice.customer_name || '');
        }

        if (Number(invoice.discount_amount || 0) > 0) {
            setDiscountMode('amount');
            setDiscountValue(Number(invoice.discount_amount || 0));
        } else {
            setDiscountMode('amount');
            setDiscountValue(0);
        }

        setStatusMessage({
            type: 'success',
            text: `Loaded invoice ${invoice.invoice_number} successfully.`
        });
    };

    const addStockItem = (product) => {
        const stockItemId = product.stock_item_id ?? product.id;

        const existingInCart = stockRows.find((row) => String(row.stock_item_id) === String(stockItemId));
        const currentQty = existingInCart ? Number(existingInCart.quantity || 0) : 0;
        const targetQty = currentQty + 1;
        const availableStock = Number(product.stock || 0);

        const allowOversell = shopSettings?.allow_oversell === '1' || shopSettings?.allow_oversell === true;

        if (targetQty > availableStock && !allowOversell) {
            playFeedbackSound(false);
            setStatusMessage({
                type: 'error',
                text: availableStock > 0
                    ? `Only ${availableStock} units available.`
                    : `Out of stock: "${product.name}"`
            });
            return false;
        }

        setStockRows((current) => {
            const existing = current.find((row) => String(row.stock_item_id) === String(stockItemId));
            if (existing) {
                return current.map((row) => (
                    String(row.stock_item_id) === String(stockItemId)
                        ? { ...row, quantity: Number(row.quantity || 0) + 1 }
                        : row
                ));
            }

            return [
                ...current,
                {
                    id: `stock-${stockItemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    description: product.name,
                    quantity: 1,
                    unit_price: Number(product.price || 0),
                    original_unit_price: Number(product.price || 0),
                    stock_item_id: stockItemId,
                    pos_tab_id: null,
                    stock: Number(product.stock || 0),
                    sku: product.sku ?? null,
                    size: product.size ?? null,
                    discount_type: 'amount',
                    discount_value: 0,
                },
            ];
        });

        return true;
    };

    const handleProductSelect = (product) => {
        if (product.variants && product.variants.length > 1) {
            setSelectedProductGroup(product);
            return;
        }
        addStockItem(product);
    };

    const removeItem = (itemId) => {
        setManualRows((current) => current.filter((row) => row.id !== itemId));
        setStockRows((current) => current.filter((row) => row.id !== itemId));
    };

    const handleClearCart = () => {
        setManualRows([makeManualRow(itemTypes)]);
        setStockRows([]);
        setDiscountValue(0);
        setErrors(prev => ({ ...prev, cart: null }));
        setStatusMessage({
            type: 'success',
            text: 'Cart has been cleared.'
        });
    };

    const handleSaveBill = async () => {
        setErrors({});
        setStatusMessage({ type: '', text: '' });

        if (combinedItems.length === 0) {
            setErrors({ cart: 'Add at least one item before saving the bill.' });
            return;
        }

        const nextErrors = {};
        const requiresCustomer = paymentMethod === 'credit' || paymentMethod === 'advance';

        if (requiresCustomer && !selectedCustomerId) {
            nextErrors.customerSelection = 'Select a customer from the list for credit and advance payments.';
        }

        if ((paymentMethod === 'credit' || paymentMethod === 'advance') && !customerName.trim()) {
            nextErrors.customerName = 'Customer name is required for credit and advance payments.';
        }

        if ((paymentMethod === 'credit' || paymentMethod === 'advance') && !customerPhone.trim()) {
            nextErrors.customerPhone = 'Customer phone is required for credit and advance payments.';
        }

        if ((paymentMethod === 'credit' || paymentMethod === 'advance') && !frontOfficerId) {
            nextErrors.frontOfficerId = 'Front officer is required for credit and advance payments.';
        }

        if ((paymentMethod === 'credit' || paymentMethod === 'advance') && !promiseDate) {
            nextErrors.promiseDate = 'Promise date is required for credit and advance payments.';
        }

        if (paymentMethod === 'advance' && (!advanceAmount || Number(advanceAmount) <= 0)) {
            nextErrors.advanceAmount = 'Advance amount is required and must be greater than 0.';
        }

        if (paymentMethod === 'advance' && Number(advanceAmount) > afterDiscount) {
            nextErrors.advanceAmount = 'Advance amount cannot exceed the total amount.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            setStatusMessage({
                type: 'error',
                text: 'Please complete required payment details before saving this transaction.',
            });
            return;
        }

        const payload = {
            items: combinedItems.map((item) => ({
                category_id: item.type === 'manual' ? (item.category_id || null) : null,
                is_stock_item: item.type === 'stock',
                stock_item_id: item.type === 'stock' ? item.stock_item_id : null,
                description: item.description,
                quantity: Number(item.quantity || 0),
                unit_price: item.type === 'stock' ? Number(item.effective_base_price || item.unit_price || 0) : Number(item.unit_price || 0),
                discount_type: 'amount',
                discount_value: Number(item.discount_amount || 0) + Number(item.price_override_discount || 0),
            })),
            discount_amount: cartDiscountAmount,
            editor_id: selectedEditorId || null,
            commission_pct: selectedEditorId && applyCommission && commissionableAmount > 0
                ? Number(commissionPct || 0)
                : null,
            is_commission_applicable: Boolean(
                selectedEditorId && applyCommission && commissionableAmount > 0,
            ),
            dealer_id: selectedDealerId || null,
            dealer_commission_pct: selectedDealerId && applyDealerCommission && dealerCommissionableAmount > 0
                ? Number(dealerCommissionPct || 0)
                : null,
            is_dealer_commission_applicable: Boolean(
                selectedDealerId && applyDealerCommission && dealerCommissionableAmount > 0,
            ),
            payment_method: advanceEnabled && matchedAdvanceBill ? 'cash' : paymentMethod,
            reference_number: paymentMethod === 'bank_transfer' ? (referenceNumber || null) : null,
            bank_name: paymentMethod === 'bank_transfer' ? (bankName || null) : null,
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            customer_id: selectedCustomerId || null,
            front_officer_id: (paymentMethod === 'credit' || paymentMethod === 'advance') ? (frontOfficerId || null) : null,
            promise_date: (paymentMethod === 'credit' || paymentMethod === 'advance') ? (promiseDate || null) : null,
            advance_ref_bill_id: advanceEnabled && matchedAdvanceBill ? matchedAdvanceBill.id : null,
            advance_paid: (advanceEnabled && matchedAdvanceBill) ? Number(matchedAdvanceBill.advance_paid || 0) : ((paymentMethod === 'advance' && !matchedAdvanceBill) ? Number(advanceAmount || 0) : 0),
            advance_payment_method: paymentMethod === 'advance' ? advancePaymentMethod : null,
            paid_amount: (paymentMethod === 'advance' || paymentMethod === 'credit') ? 0 : (advanceEnabled && matchedAdvanceBill ? Number(advanceAmount || 0) : balanceDue),
            creation_charge: Number(creationChargeTotal || 0),
            creation_charge_items: creationCharges.map((item) => ({
                label: item.label,
                amount: Number(item.amount || 0),
                editor_id: item.editor_id || null,
            })),
            dealer_commission_items: dealerCommissions.map((item) => ({
                label: item.label,
                amount: Number(item.amount || 0),
                dealer_id: item.dealer_id || null,
            })),
            notes: null,
            invoice_id: activeInvoiceId || null,
        };

        setSaving(true);

        try {
            const { bill, message } = await commitPosBill(payload);
            applySavedBillFlash(bill, message);
            setActiveInvoiceId(null);
            router.reload({ only: ['recentBills', 'nextBillNo', 'products', 'manualInvoices'], preserveScroll: true });
        } catch (error) {
            if (error?.response?.status === 302 || error?.response?.status === 303) {
                const billId = extractSavedBillIdFromUrl(error.response?.headers?.location);
                if (billId) {
                    try {
                        const bill = await fetchSavedBillPayload(billId);
                        if (bill) {
                            applySavedBillFlash(bill, 'Bill saved successfully.');
                            router.reload({ only: ['recentBills', 'nextBillNo', 'products'], preserveScroll: true });
                            return;
                        }
                    } catch {
                        // fall through to generic error
                    }
                }
            }
            const status = error?.response?.status;
            const serverErrors = error?.response?.data?.errors;

            if (status === 422 && serverErrors && typeof serverErrors === 'object') {
                const normalized = {};
                Object.entries(serverErrors).forEach(([field, message]) => {
                    normalized[field] = Array.isArray(message) ? message[0] : message;
                });
                setErrors(normalized);
                setStatusMessage({
                    type: 'error',
                    text: normalized.items
                        || normalized.payment_method
                        || normalized.customer_name
                        || error?.response?.data?.message
                        || 'Transaction could not be saved. Please check the highlighted fields.',
                });
            } else {
                setStatusMessage({
                    type: 'error',
                    text: error?.response?.data?.message
                        || error?.message
                        || 'Transaction could not be saved. Please try again.',
                });
            }
        } finally {
            setSaving(false);
        }
    };

    const completeBill = (printType) => {
        if (!savedBill) return;

        setSaving(true);
        router.post(route('studio.bills.complete', savedBill.id), { print_type: printType }, {
            preserveScroll: true,
            onError: () => {
                setStatusMessage({
                    type: 'error',
                    text: 'Bill could not be completed. Check editor commission settings and try again.',
                });
            },
            onFinish: () => setSaving(false),
        });
    };

    const createCustomerFromPos = async (payload) => {
        setCreatingCustomer(true);
        setErrors((current) => ({ ...current, newCustomer: undefined }));

        try {
            const response = await window.axios.post(route('studio.customers.quick-store'), payload);
            const created = response?.data?.customer;

            if (created?.id) {
                setCustomerList((current) => {
                    const exists = current.some((customer) => String(customer.id) === String(created.id));
                    if (exists) {
                        return current;
                    }

                    return [created, ...current];
                });

                const label = created.phone ? `${created.name} (${created.phone})` : created.name;
                setSelectedCustomerId(String(created.id));
                setCustomerName(created.name || '');
                setCustomerPhone(created.phone || '');
                setCustomerSearch(label || '');
            }

            return { ok: true, customer: created };
        } catch (error) {
            const validationErrors = error?.response?.data?.errors;
            const message = validationErrors
                ? Object.values(validationErrors)[0]?.[0] || 'Failed to create customer.'
                : (error?.response?.data?.message || 'Failed to create customer.');

            setErrors((current) => ({ ...current, newCustomer: message }));
            return { ok: false, error: message };
        } finally {
            setCreatingCustomer(false);
        }
    };

    const viewBillUrl = savedBill?.id ? route('studio.bills.show', savedBill.id) : null;

    useEffect(() => {
        const handleShortcuts = (e) => {
            const key = e.key.toLowerCase();
            const isAlt = e.altKey;

            if (e.key === 'F1' || (isAlt && e.key === '/')) {
                e.preventDefault();
                setShowShortcutsModal(prev => !prev);
                return;
            }

            if (e.key === 'F2' || (isAlt && key === 's')) {
                e.preventDefault();
                focusScannerInput();
                return;
            }

            if (e.key === 'F3' || (isAlt && key === 'd')) {
                e.preventDefault();
                const discInput = document.querySelector('input[placeholder="0.00"]');
                if (discInput) {
                    discInput.focus();
                    discInput.select();
                }
                return;
            }

            if (e.key === 'F4' || (isAlt && key === 'c')) {
                e.preventDefault();
                const custInput = document.querySelector('input[placeholder="Find or add customer..."]');
                if (custInput) {
                    custInput.focus();
                    custInput.select();
                }
                return;
            }

            if (isAlt && key === 'a') {
                e.preventDefault();
                const advInput = document.querySelector('input[placeholder="Advance amount"]');
                if (advInput) {
                    advInput.focus();
                    advInput.select();
                }
                return;
            }

            if (e.key === 'F6' || (isAlt && key === 'k')) {
                e.preventDefault();
                setActiveTabId('manual');
                return;
            }

            if (e.key === 'F7' || (isAlt && key === 'e')) {
                e.preventDefault();
                setActiveTabId('creation');
                return;
            }

            if (e.key === 'F8' || (isAlt && key === 'i')) {
                e.preventDefault();
                setActiveTabId('inventory');
                return;
            }

            if (e.key === 'F9' || (isAlt && key === 'p')) {
                e.preventDefault();
                setActiveTabId('packages');
                return;
            }

            if (e.key === 'F10' || (isAlt && key === 'm')) {
                e.preventDefault();
                setActiveTabId('invoices');
                return;
            }

            if (e.key === 'F12' || (isAlt && key === 't')) {
                e.preventDefault();
                if (savedBill && !completedBillId) {
                    completeBill('thermal');
                } else {
                    handleSaveBill();
                }
                return;
            }

            if (isAlt && key === 'h') {
                e.preventDefault();
                holdCurrentOrder();
                return;
            }

            if (isAlt && key === 'q') {
                e.preventDefault();
                handleClearCart();
                return;
            }

            if (savedBill && !completedBillId) {
                if (isAlt && key === 'a') {
                    e.preventDefault();
                    completeBill('a4');
                    return;
                }
                if (isAlt && key === 'r') {
                    e.preventDefault();
                    completeBill('thermal');
                    return;
                }
                if (isAlt && key === 'n') {
                    e.preventDefault();
                    resetForm();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [savedBill, completedBillId, handleSaveBill, holdCurrentOrder, handleClearCart, completeBill, resetForm, focusScannerInput]);

    if (printMode && savedBill) {
        if (printMode === 'thermal') {
            return <BillPrintThermal bill={savedBill} shopInfo={shopInfo} invoiceSettings={invoiceSettings} onNewOrder={resetForm} activeShop={activeShop} pageShopSettings={shopSettings} />;
        }
        const templateFormat = invoiceSettings?.invoice_template || shopInfo?.invoice_template || 'default';
        if (templateFormat === 'client_format') {
            return <BillPrintClientFormat bill={savedBill} settings={invoiceSettings} shopInfo={shopInfo} onNewOrder={resetForm} />;
        }
        if (templateFormat.startsWith('arachchi_')) {
            return <BillPrintArachchiTemplate bill={savedBill} settings={invoiceSettings} shopInfo={shopInfo} variant={templateFormat} onNewOrder={resetForm} />;
        }
        return <BillPrintA4 bill={savedBill} shopInfo={shopInfo} invoiceSettings={invoiceSettings} onNewOrder={resetForm} />;
    }

    return (
        <MainLayout pageTitle="POS" isSidebarCollapsed={isFullscreen}>
            <Head title="POS" />

            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

                {/* NEW POS QUICK ACTION TOOLBAR */}
                <QuickActionToolbar
                    onChangeRate={() => {
                        if (combinedItems.length === 0) {
                            setStatusMessage({ type: 'error', text: 'Add an item to the cart first.' });
                            return;
                        }
                        setChangeRateTrigger((current) => current + 1);
                    }}
                    onChangeQty={() => {
                        if (combinedItems.length === 0) {
                            setStatusMessage({ type: 'error', text: 'Add an item to the cart first.' });
                            return;
                        }
                        setChangeQtyTrigger((current) => current + 1);
                    }}
                    onBillDiscount={() => {
                        const discInput = document.querySelector('input[placeholder="0.00"]');
                        if (discInput) {
                            discInput.focus();
                            discInput.select();
                        }
                    }}
                    onNewTransaction={() => {
                        const hasActiveTransaction =
                            combinedItems.length > 0 ||
                            Boolean(selectedCustomer) ||
                            Number(discountValue || 0) > 0;

                        if (hasActiveTransaction) {
                            const confirmed = window.confirm(
                                'You have an active transaction. Start a new transaction? Current unsaved details will be cleared.'
                            );
                            if (!confirmed) return;
                        }

                        resetForm();
                        setStatusMessage({ type: 'success', text: 'New transaction started.' });
                        setTimeout(() => barcodeInputRef.current?.focus(), 100);
                    }}
                    onScanItems={() => {
                        focusScannerInput();
                    }}
                    onProduct={() => router.visit(route('products.index'))}
                    onFindItem={() => {
                        setActiveTabId('inventory');
                        setProductSearchFocusTrigger((current) => current + 1);
                    }}
                    onHoldTransaction={holdCurrentOrder}
                    onLoadTransaction={() => setShowHeldOrdersModal(true)}
                    onBackOffice={() => router.visit(route('studio.dashboard'))}
                    onBillReprint={() => router.visit(route('studio.sales.index'))}
                    onCreditCustomer={() => {
                        setPaymentMethod('credit');
                        setStatusMessage({
                            type: 'success',
                            text: 'Credit payment selected. Please select a customer.',
                        });
                        setTimeout(() => {
                            const input = document.querySelector('input[placeholder="Find or add customer..."]');
                            if (input) {
                                input.focus();
                                input.select();
                            }
                        }, 100);
                    }}
                    onSalesman={() => {
                        setActiveTabId('manual');
                        setStatusMessage({
                            type: 'success',
                            text: 'Select the editor/salesman from the order details.',
                        });
                    }}
                    onQuotation={() => {
                        setStatusMessage({
                            type: 'error',
                            text: 'Quotation workflow has not been configured yet.',
                        });
                    }}
                    onSalesReturn={() => {
                        setStatusMessage({
                            type: 'error',
                            text: 'Sales Return workflow has not been configured yet.',
                        });
                    }}
                    onStockUpdate={() => {
                        setActiveTabId('inventory');
                        setProductSearchFocusTrigger((current) => current + 1);
                        setStatusMessage({ type: 'success', text: 'Inventory products opened.' });
                    }}
                    onOpenCashDrawer={() => {
                        setStatusMessage({
                            type: 'error',
                            text: 'Cash drawer hardware has not been configured yet.',
                        });
                    }}
                    onExpensePaidOut={() => {
                        setStatusMessage({
                            type: 'error',
                            text: 'Expense / Paid Out workflow has not been configured yet.',
                        });
                    }}
                    onCloseShift={() => {
                        if (combinedItems.length > 0) {
                            setStatusMessage({
                                type: 'error',
                                text: 'Complete or hold the current transaction before closing the shift.',
                            });
                            return;
                        }
                        setStatusMessage({
                            type: 'error',
                            text: 'Close Shift workflow has not been configured yet.',
                        });
                    }}
                    onLogout={() => {
                        if (combinedItems.length > 0) {
                            const continueLogout = window.confirm(
                                'You have an active transaction. Logout anyway? Unsaved transaction data may be lost.'
                            );
                            if (!continueLogout) return;
                        }

                        const confirmed = window.confirm('Are you sure you want to logout?');
                        if (!confirmed) return;

                        router.post(route('logout'));
                    }}
                    onLockScreen={() => {
                        setStatusMessage({
                            type: 'error',
                            text: 'Lock Screen has not been configured yet.',
                        });
                    }}
                    onToggleFullscreen={toggleFullscreen}
                />
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm shadow-slate-200/20">
                    <div className="flex items-center gap-5">
                        <div className="p-3.5 rounded-3xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                            <ReceiptText className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Transaction</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Terminal Session: {nextBillNo}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowShortcutsModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-650 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all border border-indigo-200 dark:border-indigo-850 uppercase tracking-widest"
                        >
                            <Keyboard className="w-4 h-4" />
                            Shortcuts (F1)
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowHeldOrdersModal(true)}
                            className="relative flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all border border-amber-200 dark:border-amber-800 uppercase tracking-widest"
                        >
                            <Clock className="w-4 h-4" />
                            Held
                            {heldOrders.length > 0 && (
                                <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-black shadow-lg shadow-amber-500/30 animate-in zoom-in duration-300">
                                    {heldOrders.length}
                                </span>
                            )}
                        </button>
                        <Link
                            href={route('studio.sales.index')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700 uppercase tracking-widest"
                        >
                            <ReceiptText className="w-4 h-4" />
                            History
                        </Link>
                        <Link
                            href={route('reports.daily')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Reports
                        </Link>
                    </div>
                </div>

                <Modal show={Boolean(savedBill && !completedBillId)} maxWidth="2xl" onClose={() => { setSavedBill(null); setCompletedBillId(null); }}>
                    {savedBill && (
                        <div className="p-8 sm:p-10">
                            <div className="flex items-start gap-5">
                                <div className="rounded-[2rem] bg-emerald-500/10 p-4 border border-emerald-500/20">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Transaction Saved</h2>
                                    <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">Bill {savedBill.bill_number} has been finalized. How would you like to proceed?</p>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => completeBill('a4')}
                                    disabled={saving}
                                    className="group rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-left hover:border-primary-500 hover:shadow-2xl hover:shadow-primary-500/5 transition-all disabled:opacity-60"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-2xl bg-primary-500/10 p-3 text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-all">
                                            <ReceiptText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Print Standard</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-slate-200">A4 Invoice</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => completeBill('thermal')}
                                    disabled={saving}
                                    className="group rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-left hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/5 transition-all disabled:opacity-60"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                            <Printer className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Print Fast</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-slate-200">Thermal Receipt</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => window.location.href = route('studio.bills.edit', savedBill.id)}
                                    className="group rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-left hover:border-slate-400 hover:shadow-2xl transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 text-slate-600 group-hover:bg-slate-800 dark:group-hover:bg-slate-200 group-hover:text-white dark:group-hover:text-slate-900 transition-all">
                                            <PencilLine className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Adjust Record</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-slate-200">Modify Bill</p>
                                        </div>
                                    </div>
                                </button>

                                {viewBillUrl && (
                                    <Link
                                        href={viewBillUrl}
                                        className="group rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-left hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                                <Eye className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Review Details</p>
                                                <p className="text-lg font-black text-slate-800 dark:text-slate-200">View Document</p>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </div>

                            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="inline-flex items-center gap-3 rounded-[1.5rem] bg-slate-900 dark:bg-white px-8 py-3.5 text-xs font-black text-white dark:text-slate-900 hover:opacity-90 transition-all uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Bill
                                    </button>

                                    {savedBill && (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    const { generateThermalPDFFromBillData } = await import('@/utils/pdfGenerator');
                                                    const cfg = { ...shopInfo, ...invoiceSettings };
                                                    const doc = await generateThermalPDFFromBillData(savedBill, cfg);
                                                    doc.save(`Receipt_${savedBill.bill_number}.pdf`);
                                                }}
                                                className="inline-flex items-center gap-3 rounded-[1.5rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 text-xs font-black hover:opacity-90 transition-all uppercase tracking-[0.1em] shadow-lg shadow-slate-900/10"
                                            >
                                                <Download className="w-4 h-4" />
                                                Save PDF
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const { generateThermalImageFromBillData, sharePDFOnWhatsApp, generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
                                                    const blob = await generateThermalImageFromBillData(savedBill, { shopInfo, invoiceSettings });
                                                    const message = generateWhatsAppMessageForBill(savedBill, { ...shopInfo, ...invoiceSettings });
                                                    await sharePDFOnWhatsApp(blob, `Receipt_${savedBill.bill_number}.jpg`, savedBill.customer_phone || '', message);
                                                }}
                                                className="inline-flex items-center gap-3 rounded-[1.5rem] bg-emerald-600 text-white px-6 py-3.5 text-xs font-black hover:bg-emerald-700 transition-all uppercase tracking-[0.1em] shadow-lg shadow-emerald-600/10"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                WhatsApp
                                            </button>
                                            {/* <button
                                                onClick={async () => {
                                                    const { generatePDFFromBillData } = await import('@/utils/pdfGenerator');
                                                    const cfg = { ...shopInfo, ...invoiceSettings };
                                                    const doc = await generatePDFFromBillData(savedBill, cfg);
                                                    doc.save(`Invoice_${savedBill.bill_number}.pdf`);
                                                }}
                                                className="inline-flex items-center gap-3 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all uppercase tracking-[0.1em]"
                                            >
                                                <Download className="w-4 h-4" />
                                                A4 PDF
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const { generatePDFFromBillData, sharePDFOnWhatsApp, generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
                                                    const cfg = { ...shopInfo, ...invoiceSettings };
                                                    const doc = await generatePDFFromBillData(savedBill, cfg);
                                                    const message = generateWhatsAppMessageForBill(savedBill, cfg);
                                                    await sharePDFOnWhatsApp(doc, `Invoice_${savedBill.bill_number}.pdf`, savedBill.customer_phone || '', message);
                                                }}
                                                className="inline-flex items-center gap-3 rounded-[1.5rem] bg-emerald-500/10 text-emerald-600 px-6 py-3.5 text-xs font-black hover:bg-emerald-500/20 transition-all uppercase tracking-[0.1em]"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                WhatsApp A4
                                            </button> */}
                                        </>
                                    )}
                                </div>

                                {completedBillId ? (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                            Success: Bill #{savedBill?.bill_number} finalized
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </Modal>
                <HeldOrdersModal
                    show={showHeldOrdersModal}
                    onClose={() => setShowHeldOrdersModal(false)}
                    heldOrders={heldOrders}
                    onResumeOrder={resumeHeldOrder}
                    onDeleteOrder={deleteHeldOrder}
                    onDeleteAll={deleteAllHeldOrders}
                />

                <Modal show={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} maxWidth="lg">
                    <div className="p-6 text-slate-850 dark:text-slate-100 flex flex-col max-h-[85vh]">
                        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-650 dark:text-indigo-400">
                                <Keyboard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider">
                                    POS Keyboard Shortcuts
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-350">
                                    Use these shortcuts to operate the POS terminal faster.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin max-h-[55vh] space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                                <div className="space-y-3">
                                    <h4 className="font-extrabold text-indigo-650 dark:text-indigo-300 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Navigation & Focus</h4>
                                    <ShortcutRow keys={['F2', 'Alt + S']} label="Focus Barcode Scanner" />
                                    <ShortcutRow keys={['F4', 'Alt + C']} label="Focus Customer Search" />
                                    <ShortcutRow keys={['F3', 'Alt + D']} label="Focus Cart Discount" />
                                    <ShortcutRow keys={['Alt + A']} label="Focus Advance Amount" />
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-extrabold text-indigo-650 dark:text-indigo-300 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Tab Switching</h4>
                                    <ShortcutRow keys={['F6', 'Alt + K']} label="Custom Entry" />
                                    <ShortcutRow keys={['F7', 'Alt + E']} label="Creation Charges" />
                                    <ShortcutRow keys={['F8', 'Alt + I']} label="Inventory Products" />
                                    <ShortcutRow keys={['F9', 'Alt + P']} label="Packages" />
                                    <ShortcutRow keys={['F10', 'Alt + M']} label="Manual Invoices" />
                                </div>

                                <div className="md:col-span-2 space-y-3 mt-2">
                                    <h4 className="font-extrabold text-indigo-650 dark:text-indigo-300 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Terminal Actions</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <ShortcutRow keys={['F12', 'Alt + T']} label="Commit / Save Bill" />
                                            <ShortcutRow keys={['Alt + H']} label="Hold Order" />
                                        </div>
                                        <div className="space-y-3">
                                            <ShortcutRow keys={['Alt + Q']} label="Clear Cart" />
                                            <ShortcutRow keys={['F1', 'Alt + /']} label="Toggle Shortcuts List" />
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-3 mt-2 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-150 dark:border-slate-700/60">
                                    <h4 className="font-extrabold text-indigo-650 dark:text-indigo-300 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800 pb-1">Saved Bill Actions (Print screen)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                                        <ShortcutRow keys={['Alt + R']} label="Thermal Print" />
                                        <ShortcutRow keys={['Alt + A']} label="A4 Print" />
                                        <ShortcutRow keys={['Alt + N']} label="Start New Bill" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowShortcutsModal(false)}
                                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:opacity-90 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>

                <Modal
                    show={Boolean(selectedPackageForModal)}
                    onClose={() => setSelectedPackageForModal(null)}
                    maxWidth="xl"
                >
                    <div className="p-6 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-500">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                    Package Products Configurator
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Configure physical stock items included in: <span className="text-primary-500 font-bold">{selectedPackageForModal?.name}</span>
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-b border-slate-100 dark:border-slate-800 py-4 max-h-[40vh] overflow-y-auto space-y-4">
                            {selectedPackageProducts.map((sp) => {
                                const prodInfo = products.find(p => p.id === sp.variant_id);
                                if (!prodInfo) return null;

                                return (
                                    <div key={sp.variant_id} className="flex gap-4 items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60">
                                        <div className="flex items-center gap-3 col-span-12 md:col-span-6">
                                            <input
                                                type="checkbox"
                                                id={`modal-sp-chk-${sp.variant_id}`}
                                                checked={sp.is_selected}
                                                disabled={!sp.is_optional}
                                                onChange={() => toggleModalProductSelection(sp.variant_id)}
                                                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 h-4.5 w-4.5 disabled:opacity-50"
                                            />
                                            <div className="flex flex-col ml-2">
                                                <label
                                                    htmlFor={`modal-sp-chk-${sp.variant_id}`}
                                                    className={`text-xs font-bold ${!sp.is_optional ? 'text-slate-500 dark:text-slate-400' : 'text-slate-850 dark:text-slate-205 cursor-pointer'}`}
                                                >
                                                    {prodInfo.name} ({prodInfo.sku})
                                                    {!sp.is_optional && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Included</span>}
                                                </label>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                    Quantity: {sp.quantity} • Stock: {prodInfo.stock}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {sp.is_selected && (
                                                <div className="inline-flex rounded-xl p-0.5 bg-slate-200/60 dark:bg-slate-800 border border-slate-300/40 dark:border-slate-700/50">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModalProductChargeType(sp.variant_id, 'free')}
                                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${sp.charge_type === 'free' ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-550 dark:text-slate-400 hover:text-slate-750'}`}
                                                    >
                                                        Free
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModalProductChargeType(sp.variant_id, 'paid')}
                                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${sp.charge_type === 'paid' ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-550 dark:text-slate-400 hover:text-slate-755'}`}
                                                    >
                                                        Charge (+{(prodInfo.price || 0).toLocaleString()} LKR)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedPackageForModal(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedPackageForModal) {
                                        addPackageToCartDirectly(
                                            selectedPackageForModal,
                                            selectedPackageProducts.filter(x => x.is_selected)
                                        );
                                        setSelectedPackageForModal(null);
                                    }
                                }}
                                className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary-500/20"
                            >
                                Add Package
                            </button>
                        </div>
                    </div>
                </Modal>

                <Modal show={Boolean(selectedProductGroup)} onClose={() => setSelectedProductGroup(null)} maxWidth="md">
                    <div className="p-6 max-h-[90vh] flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex-shrink-0">
                            Select Shipment for {selectedProductGroup?.name}
                        </h3>
                        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                            {selectedProductGroup?.variants
                                ?.filter((variant) => Number(variant.stock || 0) > 0)
                                .map((variant) => (
                                    <div
                                        key={variant.id}
                                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                        onClick={() => {
                                            addStockItem(variant);
                                            setSelectedProductGroup(null);
                                        }}
                                    >
                                        <div>
                                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                                {variant.name} {variant.size ? `(${variant.size})` : ''}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                SKU: {variant.sku} • Stock: {variant.stock}
                                            </p>
                                        </div>
                                        <div className="font-bold text-primary-600 dark:text-primary-400">
                                            Rs. {Number(variant.price || 0).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </Modal>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
                    {/* Left Column: Transaction Interface */}
                    <div className="space-y-8 min-w-0">
                        {/* Barcode Search/Scan Input Bar */}
                        <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-405">
                                    <Barcode className="w-5 h-5 text-white/80 animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-100">
                                        Barcode Scanner Terminal
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                        Scan barcode directly or enter SKU/barcode value below.
                                    </p>
                                </div>
                            </div>
                            <form onSubmit={handleBarcodeSearchSubmit} className="w-full md:w-auto flex items-center gap-2">
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    placeholder="Scan or enter barcode/SKU..."
                                    value={barcodeInput}
                                    onChange={(e) => setBarcodeInput(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    className="w-full md:w-64 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                                >
                                    Add
                                </button>
                            </form>
                        </div>

                        {/* Selected Invoice Banner */}
                        {loadedInvoice && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl p-5 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/20">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-650" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                                            Linked Invoice: {loadedInvoice.invoice_number}
                                        </h4>
                                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            Checkout will mark this invoice as paid and link it to the resulting sale.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveInvoiceId(null);
                                        handleClearCart();
                                        setCustomerName('');
                                        setCustomerPhone('');
                                        setSelectedCustomerId('');
                                        setCustomerSearch('');
                                    }}
                                    className="px-3.5 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors"
                                >
                                    Unlink Invoice
                                </button>
                            </div>
                        )}

                        {/* Validation Errors Area */}
                        {(statusMessage.text || errors.cart || errors.payment || printWarning) && (
                            <div className="space-y-3">
                                {statusMessage.text && (
                                    <div className={`rounded-3xl px-6 py-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 border ${statusMessage.type === 'error'
                                        ? 'border-red-200 dark:border-red-900/40 bg-red-500/5'
                                        : 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-500/5'
                                        }`}>
                                        <div className={`p-2 rounded-xl ${statusMessage.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <p className={`text-sm font-bold ${statusMessage.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {statusMessage.text}
                                        </p>
                                    </div>
                                )}
                                {errors.cart && (
                                    <div className="rounded-3xl border border-red-200 dark:border-red-900/40 bg-red-500/5 px-6 py-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{errors.cart}</p>
                                    </div>
                                )}
                                {printWarning && (
                                    <div className="rounded-3xl border border-amber-200 dark:border-amber-900/40 bg-amber-500/5 px-6 py-4 flex items-center gap-4">
                                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{printWarning}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Workflow Tabs Area */}
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200/60 dark:border-slate-800 shadow-2xl shadow-slate-200/10 overflow-hidden transition-all duration-300">
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20 flex-wrap gap-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTabId('manual')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTabId === 'manual' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'}`}
                                    >
                                        Custom Entry
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTabId('creation')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTabId === 'creation' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'}`}
                                    >
                                        Creation Charges
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTabId('inventory')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTabId === 'inventory' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'}`}
                                    >
                                        Inventory Products
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTabId('packages')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTabId === 'packages' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'}`}
                                    >
                                        Packages
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTabId('invoices')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTabId === 'invoices' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'}`}
                                    >
                                        Manual Invoices
                                    </button>
                                </div>
                                <div className="hidden md:flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Live Terminal Scoping
                                    </span>
                                </div>
                            </div>

                            <div className="p-2">
                                {activeTabId === 'manual' && (
                                    <ManualEntryTab
                                        rows={manualRows}
                                        itemTypes={itemTypes}
                                        editors={editors}
                                        selectedEditorId={selectedEditorId}
                                        commissionPct={commissionPct}
                                        applyCommission={applyCommission}
                                        commissionableAmount={commissionableAmount}
                                        commissionAmount={commissionAmount}
                                        commissionLocked={!canSetCommission || commissionableAmount <= 0}
                                        commissionEditable={canSetCommission}

                                        dealers={dealers}
                                        selectedDealerId={selectedDealerId}
                                        dealerCommissionPct={dealerCommissionPct}
                                        applyDealerCommission={applyDealerCommission}
                                        dealerCommissionableAmount={dealerCommissionableAmount}
                                        dealerCommissionAmount={dealerCommissionAmount}
                                        dealerCommissionLocked={dealerCommissionableAmount <= 0}
                                        dealerCommissionEditable={true}

                                        onAddRow={addManualRow}
                                        onUpdateRow={updateManualRow}
                                        onRemoveRow={removeManualRow}
                                        onEditorChange={setSelectedEditorId}
                                        onCommissionPctChange={setCommissionPct}
                                        onApplyCommissionChange={setApplyCommission}

                                        onDealerChange={setSelectedDealerId}
                                        onDealerCommissionPctChange={setDealerCommissionPct}
                                        onApplyDealerCommissionChange={setApplyDealerCommission}
                                    />
                                )}

                                {activeTabId === 'creation' && (
                                    <div className="p-6">
                                        <EditorCreationChargesPanel
                                            creationCharges={creationCharges}
                                            creationChargeTotal={creationChargeTotal}
                                            dealerCommissions={dealerCommissions}
                                            dealerCommissionTotal={dealerCommissionTotal}
                                            editors={editors}
                                            dealers={dealers}
                                            onCreationChargeChange={updateCreationCharge}
                                            onAddCreationCharge={addCreationChargeRow}
                                            onRemoveCreationCharge={removeCreationChargeRow}
                                            onDealerCommissionChange={updateDealerCommission}
                                            onAddDealerCommission={addDealerCommissionRow}
                                            onRemoveDealerCommission={removeDealerCommissionRow}
                                        />
                                    </div>
                                )}

                                {activeTabId === 'inventory' && (
                                    <div className="p-4 h-[calc(100vh-220px)] min-h-[500px] flex flex-col">
                                        <StockTab
                                            products={products}
                                            categories={categories}
                                            onAddToCart={handleProductSelect}
                                            focusSearchTrigger={productSearchFocusTrigger}
                                        />
                                    </div>
                                )}

                                {activeTabId === 'packages' && (
                                    <div className="p-4">
                                        <PackagesTab
                                            packages={packages}
                                            onAddPackage={addPackageToCart}
                                        />
                                    </div>
                                )}

                                {activeTabId === 'invoices' && (
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Pending Invoices
                                            </h3>
                                        </div>
                                        {manualInvoices.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-8">No pending manual invoices found.</p>
                                        ) : (
                                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                                                {manualInvoices.map((inv) => (
                                                    <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{inv.invoice_number}</span>
                                                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                                    {inv.status}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                                                                Customer: {inv.customer_name || 'Walk-in'} {inv.customer_phone ? `(${inv.customer_phone})` : ''}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                                                                Amount: {Number(inv.total_amount || 0).toLocaleString()} LKR • Items: {inv.items?.length || 0}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLoadInvoiceToCart(inv)}
                                                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all h-fit ${activeInvoiceId === inv.id
                                                                ? 'bg-emerald-500 text-white shadow-lg'
                                                                : 'bg-primary-500 hover:bg-primary-600 text-white'
                                                                }`}
                                                        >
                                                            {activeInvoiceId === inv.id ? 'Loaded' : 'Load to Cart'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Configuration Sidebar */}
                    <div className="space-y-8 lg:sticky lg:top-24 pb-10">
                        {/* Cart Summary & Payment Panel */}
                        <CartPanel
                            billNumber={nextBillNo}
                            billDate={billDate}
                            customerName={customerName}
                            customerPhone={customerPhone}
                            customerSearch={customerSearch}
                            customerOptions={customerOptions}
                            selectedCustomer={selectedCustomer}
                            selectedCustomerId={selectedCustomerId}
                            changeQtyTrigger={changeQtyTrigger}
                            changeRateTrigger={changeRateTrigger}
                            onBillDateChange={setBillDate}
                            onCustomerNameChange={setCustomerName}
                            onCustomerPhoneChange={setCustomerPhone}
                            onCustomerSearchChange={(value) => {
                                setCustomerSearch(value);

                                const normalized = value.trim().toLowerCase();
                                const match = customerOptions.find((customer) => {
                                    const name = String(customer.name || '').toLowerCase();
                                    const phone = String(customer.phone || '').toLowerCase();
                                    const label = String(customer.label || '').toLowerCase();
                                    return normalized === name || normalized === phone || normalized === label;
                                });

                                if (match) {
                                    setSelectedCustomerId(String(match.id));
                                    setCustomerName(match.name || '');
                                    setCustomerPhone(match.phone || '');
                                    setErrors((current) => ({ ...current, customerSelection: undefined }));
                                } else {
                                    setSelectedCustomerId('');
                                    setCustomerName('');
                                    setCustomerPhone('');
                                }
                            }}
                            onClearCustomer={() => {
                                setSelectedCustomerId('');
                                setCustomerSearch('');
                                setCustomerName('');
                                setCustomerPhone('');
                            }}
                            onCustomerSelectById={(customerId) => {
                                const match = customerOptions.find((customer) => String(customer.id) === String(customerId));
                                if (!match) {
                                    setSelectedCustomerId('');
                                    return;
                                }

                                setSelectedCustomerId(String(match.id));
                                setCustomerName(match.name || '');
                                setCustomerPhone(match.phone || '');
                                setCustomerSearch(match.label || match.name || '');
                            }}
                            items={combinedItems}
                            onUpdateQuantity={(itemId, value) => {
                                setManualRows((current) => current.map((row) => {
                                    if (row.id !== itemId) return row;
                                    if (value === '' || Number(value) < 0) {
                                        return { ...row, quantity: value };
                                    }
                                    return { ...row, quantity: Number(value) };
                                }));
                                setStockRows((current) => current.map((row) => {
                                    if (row.id !== itemId) return row;
                                    if (value === '' || Number(value) < 0) {
                                        return { ...row, quantity: value };
                                    }
                                    const numVal = Number(value);
                                    return row.stock ? { ...row, quantity: Math.min(numVal, Number(row.stock)) } : { ...row, quantity: numVal };
                                }));
                            }}
                            onUpdateDiscountMode={(itemId, mode) => {
                                setManualRows((current) => current.map((row) => (row.id === itemId ? { ...row, discount_type: mode } : row)));
                                setStockRows((current) => current.map((row) => (row.id === itemId ? { ...row, discount_type: mode } : row)));
                            }}
                            onUpdateDiscountValue={(itemId, value) => {
                                setManualRows((current) => current.map((row) => (row.id === itemId ? { ...row, discount_value: Math.max(0, Number(value || 0)) } : row)));
                                setStockRows((current) => current.map((row) => (row.id === itemId ? { ...row, discount_value: Math.max(0, Number(value || 0)) } : row)));
                            }}
                            onUpdateUnitPrice={(itemId, value) => {
                                setManualRows((current) => current.map((row) => (row.id === itemId ? { ...row, unit_price: value } : row)));
                                setStockRows((current) => current.map((row) => (row.id === itemId ? { ...row, unit_price: value } : row)));
                            }}
                            onRemoveItem={removeItem}
                            onClearCart={handleClearCart}
                            subtotal={subtotal}
                            discountMode={discountMode}
                            discountValue={discountValue}
                            onDiscountModeChange={setDiscountMode}
                            onDiscountValueChange={setDiscountValue}
                            discountAmount={discountAmount}
                            creationChargeTotal={creationChargeTotal}
                            afterDiscount={afterDiscount}
                            advanceEnabled={advanceEnabled}
                            onAdvanceEnabledChange={setAdvanceEnabled}
                            advanceBillNo={advanceBillNo}
                            onAdvanceBillNoChange={setAdvanceBillNo}
                            advanceAmount={advanceAmount}
                            onAdvanceAmountChange={setAdvanceAmount}
                            matchedAdvanceBill={matchedAdvanceBill}
                            paymentMethod={paymentMethod}
                            onPaymentMethodChange={setPaymentMethod}
                            advancePaymentMethod={advancePaymentMethod}
                            onAdvancePaymentMethodChange={setAdvancePaymentMethod}
                            referenceNumber={referenceNumber}
                            onReferenceNumberChange={setReferenceNumber}
                            bankName={bankName}
                            onBankNameChange={setBankName}
                            frontOfficers={frontOfficers}
                            frontOfficerId={frontOfficerId}
                            onFrontOfficerIdChange={setFrontOfficerId}
                            promiseDate={promiseDate}
                            onPromiseDateChange={setPromiseDate}
                            customerRequired={paymentMethod === 'credit' || paymentMethod === 'advance'}
                            errors={errors}
                            balanceDue={balanceDue}
                            onSaveBill={handleSaveBill}
                            saving={saving}
                            creatingCustomer={creatingCustomer}
                            onCreateCustomer={createCustomerFromPos}
                            viewCustomerProfileUrl={selectedCustomer?.id ? route('customers.show', selectedCustomer.id) : null}
                            lastSavedBill={lastSavedBill}
                            recentBills={recentBills}
                            invoiceSettings={invoiceSettings}
                            shopInfo={shopInfo}
                            onNewOrder={resetForm}
                            holdNote={holdNote}
                            onHoldNoteChange={setHoldNote}
                            onHoldOrder={holdCurrentOrder}
                            heldOrdersCount={heldOrders.length}
                            onShowHeldOrders={() => setShowHeldOrdersModal(true)}
                        />

                        {/* Quick Navigation Footer */}
                        <div className="px-6 py-4 bg-slate-950 rounded-[2rem] border border-slate-800 flex items-center justify-between shadow-2xl">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Operator</span>
                                <span className="text-xs font-bold text-slate-200">{auth?.user?.name || 'Counter One'}</span>
                            </div>
                            <div className="h-8 w-px bg-slate-800" />
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Shop Node</span>
                                <span className="text-xs font-bold text-primary-400">{shopSettings?.shop_name || 'Main Studio'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
