import { useEffect, useRef } from 'react';
import { Printer, Download, MessageCircle, Plus } from 'lucide-react';
import { generatePDFFromElement, sharePDFOnWhatsApp } from '@/utils/pdfGenerator';

/**
 * Client Format Invoice — A professional blue-accent A4 invoice.
 * This template does NOT include a "Transportation Details" section.
 */
export default function BillPrintClientFormat({ bill, settings, invoiceSettings, shopInfo, onNewOrder }) {
    const cfg = { ...(shopInfo || {}), ...(invoiceSettings || {}), ...(settings || {}) };
    const items = bill?.items ?? [];
    const logoCandidates = [
        cfg.shop_logo_url,
        cfg.shop_logo ? `/storage/${String(cfg.shop_logo).replace(/^\/?storage\//, '')}` : null,
        '/Logo.png',
    ].filter(Boolean);

    const subtotal = Number(bill?.subtotal ?? 0);
    const discount = Number(bill?.discount_amount ?? 0);
    const advancePaid = Number(bill?.advance_paid ?? 0);
    const paidAmount = Number(bill?.paid_amount ?? 0);
    const balanceDue = Number(bill?.balance_due ?? 0);
    const total = Number(bill?.total_amount ?? bill?.after_discount ?? Math.max(0, subtotal - discount));

    const fmtMoney = (val) => Number(val ?? 0).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const fmtDate = (val) => {
        if (!val) return 'N/A';
        const d = new Date(val);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd} / ${mm} / ${yyyy}`;
    };

    const printInvoice = () => {
        window.print();
    };

    const invoiceRef = useRef(null);

    const saveBillAsPDF = async () => {
        try {
            const el = invoiceRef.current;
            if (!el) { printInvoice(); return; }
            const doc = await generatePDFFromElement(el);
            doc.save(`Invoice_${bill?.bill_number ?? 'BILL'}.pdf`);
        } catch (error) {
            console.error('PDF generation failed:', error);
            printInvoice();
        }
    };

    const sendViaWhatsApp = async () => {
        try {
            const el = invoiceRef.current;
            if (!el) { alert('Invoice element not found.'); return; }
            const doc = await generatePDFFromElement(el);
            const filename = `Invoice_${bill?.bill_number ?? 'BILL'}.pdf`;
            const { generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
            const message = generateWhatsAppMessageForBill(bill, cfg);
            await sharePDFOnWhatsApp(doc, filename, bill?.customer_phone || '', message);
        } catch (error) {
            console.error('WhatsApp share failed:', error);
            alert('Could not generate PDF for WhatsApp.');
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

                * { box-sizing: border-box; }

                body {
                    margin: 0;
                    background: #f1f5f9;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                    color: #1e293b;
                }

                .cf-invoice-root {
                    min-height: 100vh;
                    padding: 0;
                }

                .cf-invoice {
                    width: 210mm;
                    min-height: 297mm;
                    margin: auto;
                    background: white;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* ── Header ── */
                .cf-header {
                    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
                    color: white;
                    padding: 24px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .cf-header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .cf-logo {
                    height: 56px;
                    object-fit: contain;
                    border-radius: 8px;
                }

                .cf-brand-name {
                    font-size: 22px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }

                .cf-brand-sub {
                    font-size: 10px;
                    color: #94a3b8;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin-top: 2px;
                }

                .cf-header-right {
                    text-align: right;
                }

                .cf-inv-title {
                    font-size: 28px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: #38bdf8;
                }

                .cf-inv-label {
                    font-size: 10px;
                    color: #94a3b8;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-top: 6px;
                }

                .cf-inv-value {
                    font-size: 13px;
                    font-weight: 600;
                    color: white;
                    margin-top: 1px;
                }

                /* ── Bill To Section ── */
                .cf-info-bar {
                    display: flex;
                    justify-content: space-between;
                    padding: 16px 30px;
                    background: #f8fafc;
                    border-bottom: 2px solid #e2e8f0;
                }

                .cf-info-section h4 {
                    font-size: 10px;
                    color: #94a3b8;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin: 0 0 4px 0;
                    font-weight: 700;
                }

                .cf-info-section p {
                    margin: 2px 0;
                    font-size: 13px;
                    font-weight: 500;
                }

                /* ── Items Table ── */
                .cf-table-wrap {
                    padding: 0 30px;
                    flex: 0 0 auto;
                }

                .cf-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                .cf-table thead th {
                    background: #0f172a;
                    color: #38bdf8;
                    font-size: 10px;
                    padding: 10px 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                }

                .cf-table thead th:first-child { border-radius: 8px 0 0 0; }
                .cf-table thead th:last-child { border-radius: 0 8px 0 0; }

                .cf-table tbody td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 12px;
                }

                .cf-table tbody tr:hover {
                    background: #f8fafc;
                }

                .cf-table .text-right { text-align: right; }
                .cf-table .text-center { text-align: center; }

                /* ── Summary ── */
                .cf-summary {
                    padding: 16px 30px;
                    display: flex;
                    justify-content: flex-end;
                }

                .cf-summary-box {
                    width: 260px;
                }

                .cf-summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                    font-size: 13px;
                }

                .cf-summary-row.total-row {
                    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 10px;
                    font-weight: 800;
                    font-size: 15px;
                    margin-top: 6px;
                }

                .cf-summary-row .label { color: #64748b; }
                .cf-summary-row .value { font-weight: 600; }

                /* ── Footer ── */
                .cf-footer {
                    margin-top: auto;
                    padding: 16px 30px;
                    border-top: 2px solid #e2e8f0;
                }

                .cf-footer-content {
                    display: flex;
                    justify-content: space-between;
                    gap: 30px;
                }

                .cf-footer-section h5 {
                    font-size: 10px;
                    color: #94a3b8;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin: 0 0 6px 0;
                    font-weight: 700;
                }

                .cf-footer-section p {
                    margin: 2px 0;
                    font-size: 11px;
                    color: #64748b;
                }

                .cf-footer-bar {
                    margin-top: 12px;
                    padding-top: 10px;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: center;
                    gap: 24px;
                    font-size: 10px;
                    color: #94a3b8;
                }

                /* ── Action Buttons ── */
                .cf-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    justify-content: center;
                    padding: 16px;
                }

                .cf-btn {
                    border: none;
                    padding: 10px 24px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                }

                .cf-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .cf-btn-print { background: #0f172a; color: white; }
                .cf-btn-save { background: #1e3a5f; color: white; }
                .cf-btn-wa { background: #25D366; color: white; }

                @page { size: A4; margin: 0; }

                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; background: white; }
                    .cf-invoice { margin: 0; box-shadow: none; height: 297mm; }
                    .cf-footer { margin-top: auto; }

                    .cf-table thead th {
                        background: #0f172a !important;
                        color: #38bdf8 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .cf-header {
                        background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%) !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .cf-summary-row.total-row {
                        background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%) !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            <div className="cf-invoice-root">
                <div className="no-print cf-actions">
                    <button onClick={printInvoice} className="cf-btn cf-btn-print">
                        <Printer className="w-4 h-4" /> Print Invoice
                    </button>
                    <button onClick={saveBillAsPDF} className="cf-btn cf-btn-save">
                        <Download className="w-4 h-4" /> Save Bill
                    </button>
                    <button onClick={sendViaWhatsApp} className="cf-btn cf-btn-wa">
                        <MessageCircle className="w-4 h-4" /> Send via WhatsApp
                    </button>
                    {onNewOrder && (
                        <button onClick={onNewOrder} className="cf-btn cf-btn-print" style={{ background: '#0f172a' }}>
                            <Plus className="w-4 h-4" /> New Bill
                        </button>
                    )}
                </div>

                <div className="cf-invoice" ref={invoiceRef}>
                    {/* ── Header ── */}
                    <div className="cf-header">
                        <div className="cf-header-left">
                            <img
                                src={logoCandidates[0]}
                                alt="Logo"
                                className="cf-logo"
                                onError={(e) => {
                                    const fallbackIndex = Number(e.currentTarget.dataset.logoFallbackIndex || 0);
                                    const nextIndex = fallbackIndex + 1;
                                    if (nextIndex < logoCandidates.length) {
                                        e.currentTarget.dataset.logoFallbackIndex = String(nextIndex);
                                        e.currentTarget.src = logoCandidates[nextIndex];
                                    } else {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.style.display = 'none';
                                    }
                                }}
                            />
                            <div>
                                <div className="cf-brand-name">{cfg.shop_name ?? 'Photography Studio'}</div>
                                <div className="cf-brand-sub">{cfg.tagline ?? 'Professional Photography'}</div>
                            </div>
                        </div>
                        <div className="cf-header-right">
                            <div className="cf-inv-title">INVOICE</div>
                            <div className="cf-inv-label">Invoice No</div>
                            <div className="cf-inv-value">{bill?.bill_number ?? 'N/A'}</div>
                            <div className="cf-inv-label">Date</div>
                            <div className="cf-inv-value">{fmtDate(bill?.created_at)}</div>
                        </div>
                    </div>

                    {/* ── Bill To / Invoice Details ── */}
                    <div className="cf-info-bar">
                        <div className="cf-info-section">
                            <h4>Bill To</h4>
                            <p style={{ fontWeight: 700 }}>{bill?.customer_name || 'Walk-in Customer'}</p>
                            {bill?.customer_phone && <p>{bill.customer_phone}</p>}
                        </div>
                        <div className="cf-info-section" style={{ textAlign: 'right' }}>
                            <h4>Payment</h4>
                            <p>{
                                bill?.payment_method === 'advance'
                                    ? (bill.advance_payment_method
                                        ? `Advance (${bill.advance_payment_method === 'bank_transfer' ? 'Online' : bill.advance_payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())})`
                                        : 'Advance')
                                    : (bill?.payment_method
                                        ? (bill.payment_method === 'bank_transfer' ? 'Online' : String(bill.payment_method).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))
                                        : 'Cash')
                            }</p>
                        </div>
                    </div>

                    {/* ── Items Table ── */}
                    <div className="cf-table-wrap">
                        <table className="cf-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>#</th>
                                    <th style={{ textAlign: 'left' }}>Description</th>
                                    <th className="text-right" style={{ width: '100px' }}>Unit Price</th>
                                    <th className="text-center" style={{ width: '70px' }}>Qty</th>
                                    <th className="text-right" style={{ width: '110px' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => {
                                    const qty = Number(item.quantity ?? item.qty ?? 0);
                                    const price = Number(item.unit_price ?? item.price ?? 0);
                                    const line = Number(item.line_total ?? qty * price);

                                    const catName = item.category?.name || item.category_name || item.stock_item?.variant?.product?.category?.name || item.stockItem?.variant?.product?.category?.name;

                                    return (
                                        <tr key={item.id ?? i}>
                                            <td className="text-center" style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                                            <td>
                                                {catName && (
                                                    <span style={{ display: 'block', fontSize: '9px', color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                                                        {catName}
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: 500 }}>{item.description ?? '-'}</span>
                                            </td>
                                            <td className="text-right">{fmtMoney(price)}</td>
                                            <td className="text-center">{qty}</td>
                                            <td className="text-right" style={{ fontWeight: 600 }}>{fmtMoney(line)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Summary (NO Transportation Details) ── */}
                    <div className="cf-summary">
                        <div className="cf-summary-box">
                            <div className="cf-summary-row">
                                <span className="label">Subtotal</span>
                                <span className="value">{fmtMoney(subtotal)}</span>
                            </div>

                            {discount > 0 && (
                                <div className="cf-summary-row">
                                    <span className="label">Discount</span>
                                    <span className="value" style={{ color: '#dc2626' }}>- {fmtMoney(discount)}</span>
                                </div>
                            )}

                            <div className="cf-summary-row total-row">
                                <span>TOTAL AMOUNT</span>
                                <span>{fmtMoney(total)}</span>
                            </div>

                            {balanceDue > 0 ? (
                                <>
                                    {advancePaid > 0 && (
                                        <div className="cf-summary-row" style={{ marginTop: '8px', color: '#059669', fontWeight: 'bold' }}>
                                            <span className="label">Advance Paid</span>
                                            <span className="value">{fmtMoney(advancePaid)}</span>
                                        </div>
                                    )}

                                    {paidAmount > 0 && (
                                        <div className="cf-summary-row" style={{ marginTop: '4px', color: '#059669', fontWeight: 'bold' }}>
                                            <span className="label">Balance Payment</span>
                                            <span className="value">{fmtMoney(paidAmount)}</span>
                                        </div>
                                    )}

                                    <div className="cf-summary-row" style={{ marginTop: '8px', padding: '6px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
                                        <span className="label" style={{ fontWeight: 700, color: '#dc2626' }}>Balance Due</span>
                                        <span className="value" style={{ color: '#dc2626', fontWeight: 'bold' }}>{fmtMoney(balanceDue)}</span>
                                    </div>
                                </>
                            ) : (
                                (advancePaid + paidAmount) > 0 && (
                                    <div className="cf-summary-row" style={{ marginTop: '8px', padding: '6px', backgroundColor: '#dcfce7', borderRadius: '4px' }}>
                                        <span className="label" style={{ fontWeight: 700, color: '#059669' }}>Status</span>
                                        <span className="value" style={{ color: '#059669', fontWeight: 'bold' }}>FULLY PAID ✓</span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="cf-footer">
                        <div className="cf-footer-content">
                            <div className="cf-footer-section">
                                <h5>Terms &amp; Conditions</h5>
                                <div style={{ whiteSpace: 'pre-line', fontSize: '11px', color: '#64748b' }}>
                                    {cfg.termsConditions || cfg.invoice_terms || 'Goods once sold are not refundable or exchangeable.\nThe company is not responsible for any damages after delivery.'}
                                </div>
                            </div>
                            <div className="cf-footer-section" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <h5>Payment Information</h5>
                                {(cfg.invoice_payment_info || cfg.payment_info) ? (
                                    <div style={{ whiteSpace: 'pre-line', fontSize: '11px', color: '#64748b' }}>
                                        {cfg.invoice_payment_info || cfg.payment_info}
                                    </div>
                                ) : (
                                    <>
                                        <p>Account: {cfg.bank_account_no || '-'}</p>
                                        <p>Name: {cfg.account_name || '-'}</p>
                                        <p>Bank: {cfg.bank_details || '-'}</p>
                                    </>
                                )}
                                <div style={{ marginTop: '20px', textAlign: 'center', width: '160px' }}>
                                    <div style={{ borderBottom: '1px solid #64748b', marginBottom: '4px' }}></div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>Received By:</div>
                                </div>
                            </div>
                        </div>
                        <div className="cf-footer-bar">
                            <span>{cfg.phone ?? '-'}</span>
                            <span>•</span>
                            <span>{cfg.email ?? '-'}</span>
                            <span>•</span>
                            <span>{cfg.address ?? '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
