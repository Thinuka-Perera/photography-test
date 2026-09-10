import React, { useRef, useMemo, useState, useEffect } from 'react';

import { MessageCircle, Download } from 'lucide-react';
import { generateImageBlobFromElement, downloadImageFromElement, sharePDFOnWhatsApp } from '@/utils/pdfGenerator';
import { formatReceiptQuantity } from '@/utils/format';

/** Default public fallbacks when no shop logo is configured in settings. */
const DEFAULT_LOGO_FALLBACKS = ['/Logo.png', '/images/logo.png'];

/**
 * Normalize logo paths from settings into a browser-loadable src.
 * Handles full URLs, /storage/ paths, and bare storage keys (shop/logos/...).
 */
function normalizeLogoUrl(value) {
    if (value == null) {
        return null;
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const { pathname } = new URL(trimmed);
            // Same-origin relative path avoids APP_URL mismatches between env and browser.
            if (pathname.startsWith('/storage/')) {
                return pathname;
            }
        } catch {
            // keep absolute URL below
        }
        return trimmed;
    }

    if (trimmed.startsWith('/storage/')) {
        return trimmed;
    }

    if (trimmed.startsWith('storage/')) {
        return `/${trimmed}`;
    }

    return `/storage/${trimmed.replace(/^\/?storage\//, '')}`;
}

/**
 * Build an ordered, de-duplicated list of logo URLs to try (shop settings → public defaults).
 */
function buildLogoCandidates(...sources) {
    const candidates = [];

    for (const source of sources) {
        const normalized = normalizeLogoUrl(source);
        if (normalized && !candidates.includes(normalized)) {
            candidates.push(normalized);
        }
    }

    for (const fallback of DEFAULT_LOGO_FALLBACKS) {
        if (!candidates.includes(fallback)) {
            candidates.push(fallback);
        }
    }

    return candidates;
}

/**
 * BillPrintThermal.jsx
 *
 * Printable thermal printer format (80mm width).
 */
export default function BillPrintThermal({ bill = {}, shopInfo = {}, invoiceSettings = {}, onNewOrder = null, activeShop = null, pageShopSettings = {} }) {
    // shopInfo must win over invoiceSettings — invoice uses different keys (phone/address)
    // and was overwriting the thermal header with stale or empty values.
    const cfg = useMemo(
        () => ({ ...(invoiceSettings || {}), ...(shopInfo || {}) }),
        [shopInfo, invoiceSettings],
    );

    /**
     * Receipt header fields — active shop first, then POS shopInfo, then shared shopSettings.
     */
    const pick = (...values) => {
        for (const value of values) {
            if (value == null) continue;
            const text = String(value).trim();
            if (text !== '') return text;
        }
        return '';
    };

    const shopDetails = useMemo(() => {
        const active = activeShop ?? {};

        return {
            shop_name: pick(
                active.shop_name,
                active.name,
                shopInfo?.shop_name,
                pageShopSettings?.shop_name,
                cfg.shop_name,
            ) || 'Shop',
            shop_address: pick(
                active.shop_address,
                active.address,
                shopInfo?.shop_address,
                shopInfo?.address,
                pageShopSettings?.shop_address,
                pageShopSettings?.address,
                cfg.shop_address,
                cfg.address,
            ),
            shop_hotline: pick(
                active.shop_hotline,
                active.phone,
                shopInfo?.shop_hotline,
                shopInfo?.shop_phone,
                shopInfo?.phone,
                pageShopSettings?.shop_hotline,
                pageShopSettings?.shop_phone,
                cfg.shop_hotline,
                cfg.shop_phone,
                cfg.phone,
            ),
            shop_whatsapp: pick(
                active.shop_whatsapp,
                shopInfo?.shop_whatsapp,
                pageShopSettings?.shop_whatsapp,
                cfg.shop_whatsapp,
            ),
            shop_logo_url: pick(
                active.shop_logo_url,
                shopInfo?.shop_logo_url,
                pageShopSettings?.shop_logo_url,
                cfg.shop_logo_url,
            ) || null,
            shop_logo: pick(
                active.shop_logo,
                shopInfo?.shop_logo,
                pageShopSettings?.shop_logo,
                cfg.shop_logo,
            ) || null,
        };
    }, [activeShop, shopInfo, pageShopSettings, cfg]);

    const {
        shop_name,
        shop_address,
        shop_hotline,
        shop_whatsapp,
        shop_logo_url,
        shop_logo,
    } = shopDetails;

    const {
        bill_number,
        created_at,
        customer_name,
        customer_phone,
        items = [],
        bill_items = [],
        subtotal = 0,
        discount_amount = 0,
        after_discount = 0,
        total_amount = 0,
        paid_amount = 0,
        advance_paid = 0,
        payment_method,
        advance_payment_method,
        status = '',
        invoice_number,
    } = bill;

    const logoCandidates = useMemo(
        () => buildLogoCandidates(
            shop_logo_url,
            shop_logo,
            pageShopSettings?.shop_logo_url,
            pageShopSettings?.shop_logo,
        ),
        [shop_logo_url, shop_logo, pageShopSettings?.shop_logo_url, pageShopSettings?.shop_logo],
    );

    const [logoIndex, setLogoIndex] = useState(0);
    const activeLogoSrc = logoCandidates[logoIndex] ?? logoCandidates[0] ?? null;

    useEffect(() => {
        setLogoIndex(0);
    }, [logoCandidates]);

    useEffect(() => {
        if (logoCandidates.length === 0) {
            console.warn('[Receipt] No shop logo configured and no default logo fallbacks available.', {
                shop_logo_url,
                shop_logo,
                pageShopSettings,
            });
        }
    }, [logoCandidates.length, shop_logo_url, shop_logo, pageShopSettings]);

    const displayItems = items.length > 0 ? items : bill_items;
    const displayTotal = Number(after_discount || total_amount || 0);
    const advancePaid = Number(advance_paid || 0);
    const paidAmount = Number(paid_amount || 0);
    const calculatedBalanceDue = Math.max(0, displayTotal - advancePaid - paidAmount);

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-LK', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-LK', {
            currency: 'LKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(val || 0);
    };

    /** Display quantity as x1 (not x1.00) for whole-number line items. */
    const formatQtyLabel = (quantity) => `x${formatReceiptQuantity(quantity)}`;

    const invoiceRef = useRef(null);
    const [savingJpg, setSavingJpg] = useState(false);

    const receiptFilename = `Receipt_${bill?.bill_number ?? 'BILL'}.jpg`;

    const handleLogoError = (event) => {
        const failedSrc = event.currentTarget.currentSrc || event.currentTarget.src;
        const nextIndex = logoIndex + 1;

        console.error('[Receipt] Shop logo failed to load:', {
            failedSrc,
            attempt: logoIndex + 1,
            totalCandidates: logoCandidates.length,
            nextCandidate: logoCandidates[nextIndex] ?? null,
            shop_logo_url,
            shop_logo,
        });

        if (nextIndex < logoCandidates.length) {
            setLogoIndex(nextIndex);
            return;
        }

        console.error('[Receipt] All logo candidates exhausted. Check storage:link and Settings → Shop Logo.', logoCandidates);
        event.currentTarget.onerror = null;
    };

    const saveAsJpg = async () => {
        const el = invoiceRef.current;
        if (!el) {
            alert('Receipt element not found.');
            return;
        }

        setSavingJpg(true);
        try {
            // html2canvas capture at 2x scale for a crisp thermal-width JPG download.
            await downloadImageFromElement(el, receiptFilename, { scale: 2 });
        } catch (error) {
            console.error('JPG download failed:', error);
            alert('Could not save receipt as JPG. Please try again.');
        } finally {
            setSavingJpg(false);
        }
    };

    const sendViaWhatsApp = async () => {
        try {
            const el = invoiceRef.current;
            if (!el) {
                alert('Invoice element not found.');
                return;
            }
            const blob = await generateImageBlobFromElement(el);
            const { generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
            const message = generateWhatsAppMessageForBill(bill, cfg);
            await sharePDFOnWhatsApp(blob, receiptFilename, bill?.customer_phone || '', message);
        } catch (error) {
            console.error('WhatsApp share failed:', error);
            alert('Could not generate JPG for WhatsApp. Please try again.');
        }
    };

    return (
        <div className="print-thermal-wrapper bg-slate-100 min-h-screen">
            <div className="no-print" style={{ textAlign: 'center', padding: '16px', background: '#fff', borderBottom: '1px solid #eee', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        style={{ background: '#0f172a', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        Print Thermal
                    </button>
                    <button
                        type="button"
                        onClick={saveAsJpg}
                        disabled={savingJpg}
                        style={{ background: '#1e3a5f', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: savingJpg ? 0.7 : 1 }}
                    >
                        <Download size={16} />
                        {savingJpg ? 'Saving…' : 'Save as JPG'}
                    </button>
                    <button
                        type="button"
                        onClick={sendViaWhatsApp}
                        style={{ background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <MessageCircle size={16} />
                        Send via WhatsApp
                    </button>
                    {onNewOrder && (
                        <button
                            type="button"
                            onClick={onNewOrder}
                            style={{ background: '#64748b', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                        >
                            New Bill
                        </button>
                    )}
                </div>
            </div>

            <div className="print-thermal-container bg-white p-0 mx-auto" ref={invoiceRef} style={{ width: '80mm', fontFamily: 'monospace' }}>
                <style>{`
                @media print {
                    body { margin: 0; padding: 0; background: #fff !important; }
                    .no-print { display: none !important; }
                    .print-thermal-wrapper {
                        background: #fff !important;
                        min-height: auto !important;
                        padding: 0 !important;
                    }
                    .print-thermal-container {
                        width: 80mm;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        page-break-after: always;
                    }
                    .thermal-logo {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        image-rendering: -webkit-optimize-contrast !important;
                        display: block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                }
                .print-thermal-container {
                    width: 80mm;
                    padding: 4mm;
                    font-size: 11px;
                    line-height: 1.35;
                    color: #000;
                    font-family: 'Courier New', monospace;
                }
                .thermal-header {
                    text-align: center;
                    margin-bottom: 3mm;
                }
                .thermal-logo-wrap {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 0 auto 2mm auto;
                    min-height: 22mm;
                    background-color: #ffffff !important;
                }
                /* Transparent PNG renders natively — avoid blend modes that hide the logo on white paper. */
                .thermal-logo {
                    width: 22mm;
                    height: 22mm;
                    max-width: 100%;
                    object-fit: contain;
                    display: block;
                    background: transparent !important;
                    visibility: visible;
                    opacity: 1;
                }
                .thermal-shop-name {
                    font-weight: 700;
                    font-size: 14px;
                    line-height: 1.35;
                    margin-top: 1mm;
                    color: #000;
                }
                .thermal-meta {
                    text-align: center;
                    font-size: 12px;
                    color: #222;
                    line-height: 1.45;
                    margin-bottom: 1.5mm;
                }
                .thermal-meta-contact {
                    text-align: center;
                    font-size: 12px;
                    color: #222;
                    line-height: 1.45;
                    margin-bottom: 1mm;
                }
                .thermal-divider {
                    border-top: 1px solid #000;
                    margin: 2mm 0;
                }
                .thermal-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 1mm 0;
                    font-size: 11px;
                }
                .thermal-item {
                    margin: 1.5mm 0;
                    padding-bottom: 1.5mm;
                    border-bottom: 1px dotted #ccc;
                }
                .thermal-item:last-child {
                    border-bottom: none;
                }
                /*
                 * Item row: aligned column-based layout.
                 * flex + min-width:0 lets long descriptions wrap, while Qty and Price stay top-aligned.
                 */
                .thermal-items-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2mm;
                    font-weight: bold;
                    font-size: 11px;
                    padding-bottom: 1.5mm;
                    border-bottom: 1px solid #000;
                    margin-bottom: 1.5mm;
                }
                .thermal-item-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 2mm;
                }
                .thermal-col-desc {
                    flex: 1 1 0%;
                    min-width: 0;
                    text-align: left;
                }
                .thermal-col-qty {
                    width: 45px;
                    flex-shrink: 0;
                    text-align: right;
                }
                .thermal-col-price {
                    width: 80px;
                    flex-shrink: 0;
                    text-align: right;
                }
                .thermal-item-desc {
                    font-weight: 600;
                    word-wrap: break-word;
                    overflow-wrap: anywhere;
                    white-space: pre-wrap;
                }
                .thermal-item-qty {
                    font-weight: 700;
                }
                .thermal-item-amount {
                    font-size: 12px;
                    font-weight: bold;
                }
                .thermal-total {
                    font-weight: bold;
                    font-size: 14px;
                    margin: 1mm 0;
                }
                .thermal-footer-note {
                    text-align: center;
                    font-size: 8px;
                    color: #555;
                    margin-top: 2mm;
                }
            `}</style>

                <div className="thermal-header">
                    {activeLogoSrc && (
                        <div className="thermal-logo-wrap">
                            <img
                                key={activeLogoSrc}
                                src={activeLogoSrc}
                                alt={`${shop_name} logo`}
                                className="thermal-logo"
                                onError={handleLogoError}
                                onLoad={() => {
                                    if (import.meta.env.DEV) {
                                        console.debug('[Receipt] Shop logo loaded:', activeLogoSrc);
                                    }
                                }}
                            />
                        </div>
                    )}
                    <div className="thermal-shop-name">{shop_name}</div>
                </div>

                {shop_address ? (
                    <div className="thermal-meta" style={{ whiteSpace: 'pre-line' }}>
                        {shop_address}
                    </div>
                ) : null}

                {shop_hotline ? (
                    <div className="thermal-meta-contact">
                        Hotline: {shop_hotline}
                    </div>
                ) : null}

                {shop_whatsapp ? (
                    <div className="thermal-meta-contact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ color: '#25D366', flexShrink: 0 }} aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.461h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span>{shop_whatsapp}</span>
                    </div>
                ) : null}
                <div className="thermal-divider" />

                <div className="thermal-row">
                    <span>Bill #: {bill_number}</span>
                </div>
                {invoice_number && (
                    <div className="thermal-row">
                        <span>Invoice Ref: {invoice_number}</span>
                    </div>
                )}
                <div className="thermal-row">
                    <span>{formatDate(created_at)}</span>
                </div>
                <div className="thermal-row">
                    <span>Customer: {customer_name || 'Walk-in'}</span>
                </div>
                {customer_phone && (
                    <div className="thermal-row">
                        <span>Ph: {customer_phone}</span>
                    </div>
                )}
                <div className="thermal-divider" />

                {displayItems.length > 0 ? (
                    <div>
                        <div className="thermal-items-header">
                            <span className="thermal-col-desc">Description</span>
                            <span className="thermal-col-qty">Qty</span>
                            <span className="thermal-col-price">Price</span>
                        </div>
                        {displayItems.map((item, idx) => {
                            const lineTotalVal = Number(item.line_total ?? (item.quantity * item.unit_price));
                            const hasDiscount = Number(item.discount_amount || 0) > 0;
                            return (
                                <div key={idx} className="thermal-item">
                                    <div className="thermal-item-row">
                                        <span className="thermal-col-desc thermal-item-desc">
                                            {item.description || '—'}
                                            {Number(item.quantity) > 1 ? (
                                                <span className="block text-[9px] font-normal text-slate-500 mt-0.5 font-mono">
                                                    {formatReceiptQuantity(item.quantity)} x Rs. {formatCurrency(item.unit_price)}
                                                </span>
                                            ) : (
                                                <span className="block text-[9px] font-normal text-slate-500 mt-0.5 font-mono">
                                                    Unit Price: Rs. {formatCurrency(item.unit_price)}
                                                </span>
                                            )}
                                            {hasDiscount && (
                                                <span className="block text-[9px] font-normal text-slate-500 italic mt-0.5">
                                                    (Disc: -{formatCurrency(item.discount_amount)})
                                                </span>
                                            )}
                                        </span>
                                        <span className="thermal-col-qty thermal-item-qty">
                                            {formatReceiptQuantity(item.quantity)}
                                        </span>
                                        <span className="thermal-col-price thermal-item-amount">
                                            {formatCurrency(lineTotalVal)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>
                        No items
                    </div>
                )}
                <div className="thermal-divider" />

                <div className="thermal-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>

                {discount_amount > 0 && (
                    <div className="thermal-row">
                        <span>Discount:</span>
                        <span>-{formatCurrency(discount_amount)}</span>
                    </div>
                )}

                <div className="thermal-divider" />

                <div className="thermal-row thermal-total">
                    <span>TOTAL AMOUNT:</span>
                    <span>{formatCurrency(displayTotal)}</span>
                </div>

                {calculatedBalanceDue > 0 ? (
                    <>
                        {advancePaid > 0 && (
                            <div className="thermal-row" style={{ color: '#059669', fontWeight: 'bold', fontSize: '12px' }}>
                                <span>Advance Paid:</span>
                                <span>{formatCurrency(advancePaid)}</span>
                            </div>
                        )}

                        {paidAmount > 0 && (
                            <div className="thermal-row" style={{ color: '#059669', fontWeight: 'bold', fontSize: '12px' }}>
                                <span>Balance Payment:</span>
                                <span>{formatCurrency(paidAmount)}</span>
                            </div>
                        )}

                        <div className="thermal-row thermal-total" style={{ color: '#dc2626' }}>
                            <span>BALANCE DUE:</span>
                            <span>{formatCurrency(calculatedBalanceDue)}</span>
                        </div>
                    </>
                ) : (
                    (advancePaid + paidAmount) > 0 && (
                        <div className="thermal-row" style={{ color: '#059669', fontWeight: 'bold', textAlign: 'center', fontSize: '12px' }}>
                            <span>✓ FULLY PAID</span>
                        </div>
                    )
                )}

                <div className="thermal-divider" />

                {payment_method && (
                    <div className="thermal-row">
                        <span>Payment: {
                            payment_method === 'advance'
                                ? (advance_payment_method
                                    ? `Advance (${advance_payment_method === 'bank_transfer' ? 'Online' : advance_payment_method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())})`
                                    : 'Advance')
                                : (payment_method === 'bank_transfer' ? 'Online' : payment_method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()))
                        }</span>
                    </div>
                )}

                {status && (
                    <div className="thermal-row">
                        <span>Status: {status}</span>
                    </div>
                )}

                <div className="thermal-divider" />
                <div className="thermal-footer-note">
                    Thank you!
                </div>
            </div>
        </div>
    );
}
