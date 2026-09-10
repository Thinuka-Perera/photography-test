import { useEffect, useRef, useState } from 'react';
import { Mail, MapPin, Phone, Printer, Download, MessageCircle, Plus } from 'lucide-react';
import { generatePDFFromElement, sharePDFOnWhatsApp } from '@/utils/pdfGenerator';
import { getCleanDescription } from '@/utils/format';

const TEMPLATE_CONFIGS = {
  arachchi_digital: {
    themeColor: '#0f766e',
    themeLight: '#14b8a6',
    themeDark: '#042f2e',
    headerBg: '#334155',
    headerTitle: 'Mr. Arachchi Digital Colour Lab (4to Focus)',
    address: 'No 38/01 Agalawatta Road, Matugama (P&S First floor)',
    phone: '070 5 17 17 18',
    hotline: 'HotLine - 071 1 84 48 66 / 076 6 39 97 83',
  },
  arachchi_studio: {
    themeColor: '#6B4423',
    themeLight: '#A67B5B',
    themeDark: '#2C1E16',
    headerBg: '#545456',
    headerTitle: 'Mr. Arachchi Studio & Gift House',
    address: "No 62/A Aluthgama Road, Matugama (infront of St, Mary's college)",
    phone: '070 755 3 755',
    hotline: 'HotLine - 071 1 844 866 / 071 3 958 221',
  },
  arachchi_wholesale: {
    themeColor: '#7f1d1d',
    themeLight: '#dc2626',
    themeDark: '#450a0a',
    headerBg: '#27272a',
    headerTitle: 'Mr. Arachchi Whole Sale Mart',
    address: "No 62/A Aluthgama Road, Matugama (infront of St, Mary's college)",
    phone: '070 755 3 755',
    hotline: 'HotLine - 071 1 844 866 / 071 3 958 221',
  }
};

export default function BillPrintArachchiTemplate({ bill, settings, invoiceSettings, shopInfo, variant = 'arachchi_digital', onNewOrder }) {
  const cfg = { ...(shopInfo || {}), ...(invoiceSettings || {}), ...(settings || {}) };
  const items = bill?.items ?? [];
  const logoCandidates = [
    cfg.shop_logo_url,
    cfg.shop_logo ? `/storage/${String(cfg.shop_logo).replace(/^\/?storage\//, '')}` : null,
    '/Logo.png',
  ].filter(Boolean);

  const tpl = TEMPLATE_CONFIGS[variant] || TEMPLATE_CONFIGS.arachchi_digital;

  const [imgSrc, setImgSrc] = useState(`/images/invoice_template_${variant}.jpeg`);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgSrc(`/images/invoice_template_${variant}.jpeg`);
    setImgLoaded(false);
    setImgFailed(false);
  }, [variant]);

  const handleImgError = (event) => {
    const formats = ['jpeg', 'png', 'jpg'];
    const currentUrl = event.currentTarget.src;
    try {
      const urlObj = new URL(currentUrl, window.location.origin);
      const pathname = urlObj.pathname;
      const currentExt = pathname.split('.').pop().toLowerCase();
      const nextIndex = formats.indexOf(currentExt) + 1;
      if (nextIndex < formats.length) {
        setImgSrc(`/images/invoice_template_${variant}.${formats[nextIndex]}`);
      } else {
        setImgFailed(true);
        setImgLoaded(false);
      }
    } catch (e) {
      setImgFailed(true);
      setImgLoaded(false);
    }
  };

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

  const applyAutoScale = () => {
    const invoice = document.querySelector('.invoice');
    if (!invoice) return false;

    const A4_HEIGHT_PX = (297 / 25.4) * 96;
    const rect = invoice.getBoundingClientRect();
    const contentHeight = rect.height;

    let scale = 1;

    if (contentHeight > A4_HEIGHT_PX) {
      scale = A4_HEIGHT_PX / contentHeight;
    }

    const safeScale = Math.min(scale * 0.98, 1);

    if (safeScale < 0.7) {
      alert(
        'This bill has too many items to fit on one page cleanly.\n\n' +
        'Please split into two bills.'
      );
      return false;
    }

    document.documentElement.style.setProperty('--print-scale', String(safeScale));
    return true;
  };

  const printInvoice = () => {
    const ok = applyAutoScale();
    if (!ok) return;

    setTimeout(() => {
      window.print();
    }, 50);
  };

  const invoiceRef = useRef(null);

  const saveBillAsPDF = async () => {
    try {
      const el = invoiceRef.current;
      if (!el) { printInvoice(); return; }
      const doc = await generatePDFFromElement(el);
      const filename = `Invoice_${bill?.bill_number ?? bill?.invoice_number ?? 'BILL'}.pdf`;
      doc.save(filename);
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
      const filename = `Invoice_${bill?.bill_number ?? bill?.invoice_number ?? 'BILL'}.pdf`;
      const { generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
      const message = generateWhatsAppMessageForBill(bill, cfg);
      await sharePDFOnWhatsApp(doc, filename, bill?.customer_phone || '', message);
    } catch (error) {
      console.error('WhatsApp share failed:', error);
      alert('Could not generate PDF for WhatsApp. Please try the Save option instead.');
    }
  };

  useEffect(() => {
    const handleBeforePrint = () => applyAutoScale();
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      document.documentElement.style.removeProperty('--print-scale');
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Lora:ital,wght@0,500;1,400&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #eee;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
        }

        :root {
          --print-scale: 1;
          --theme-color: ${tpl.themeColor};
          --theme-light: ${tpl.themeLight};
          --theme-dark: ${tpl.themeDark};
          --header-bg: ${tpl.headerBg};
        }

        .invoice-print-root {
            background: #eee;
            min-height: 100vh;
            padding: 0;
        }

        .invoice {
          width: 210mm;
          min-height: 297mm;
          margin: auto;
          background: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: scale(var(--print-scale));
          transform-origin: top center;
          position: relative;
        }

        .invoice-template-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          z-index: 0;
        }

        /* --- Geometric Background Backgrounds --- */
        .geo-bg {
            position: absolute;
            z-index: 0;
        }
        
        .geo-top-left-1 { top: 0; left: 0; width: 320px; height: 213px; background: var(--theme-color); clip-path: polygon(0 0, 100% 0, 0 100%); }
        .geo-top-left-2 { top: 0; left: 0; width: 280px; height: 186px; background: var(--theme-light); clip-path: polygon(0 0, 100% 0, 0 100%); }
        .geo-top-left-3 { top: 0; left: 0; width: 250px; height: 166px; background: var(--theme-dark); clip-path: polygon(0 0, 100% 0, 0 100%); display: flex; align-items: flex-start; justify-content: flex-start; }
        
        .geo-header-grey { top: 0; left: 0; width: 100%; height: 110px; background: var(--header-bg); clip-path: polygon(280px 0, 100% 0, 100% 100%, 115px 100%); }
        
        .geo-top-right-badge { top: 110px; right: 0; width: 320px; height: 55px; background: var(--theme-color); clip-path: polygon(45px 0, 100% 0, 100% 100%, 0 100%); display: flex; align-items: center; justify-content: flex-end; padding-right: 40px; }
        .geo-top-right-stripe { top: 110px; right: 280px; width: 60px; height: 55px; background: var(--header-bg); clip-path: polygon(45px 0, 100% 0, 15px 100%, 0 100%); }

        .geo-bottom-left-1 { bottom: 0; left: 0; width: 210px; height: 140px; background: var(--theme-color); clip-path: polygon(0 0, 0 100%, 100% 100%); }
        .geo-bottom-left-2 { bottom: 0; left: 0; width: 180px; height: 120px; background: var(--theme-light); clip-path: polygon(0 0, 0 100%, 100% 100%); }
        .geo-bottom-left-3 { bottom: 0; left: 0; width: 150px; height: 100px; background: var(--theme-dark); clip-path: polygon(0 0, 0 100%, 100% 100%); }

        .geo-bottom-right-1 { bottom: 0; right: 0; width: 270px; height: 140px; background: var(--theme-color); clip-path: polygon(100% 0, 100% 100%, 0 100%); }
        .geo-bottom-right-2 { bottom: 0; right: 0; width: 240px; height: 120px; background: var(--theme-light); clip-path: polygon(100% 0, 100% 100%, 0 100%); }
        .geo-bottom-right-3 { bottom: 0; right: 0; width: 210px; height: 100px; background: var(--theme-dark); clip-path: polygon(100% 0, 100% 100%, 0 100%); }

        /* --- Content Containers --- */
        .content-layer {
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            min-height: 100%;
            flex: 1;
        }

        .header-content {
            height: 165px; /* Leaves space for the badges */
            position: relative;
        }

        .header-text {
            position: absolute;
            top: 25px;
            left: 280px;
            color: white;
        }

        .shop-title {
            font-family: 'Lora', serif;
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 6px;
        }

        .shop-address, .shop-contact {
            font-size: 11px;
            color: #e2e8f0;
            line-height: 1.5;
        }

        .shop-logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
            margin-top: 20px;
            margin-left: 30px;
        }

        .invoice-meta-container {
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
        }

        .meta-box {
            border: 1px solid #e2e8f0;
            border-top: 3px solid var(--theme-color);
            padding: 15px 25px;
            border-radius: 6px;
            background: #fafafa;
            width: 48%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
        }
        
        .meta-row:last-child {
            margin-bottom: 0;
        }

        .meta-label {
            color: #64748b;
            font-weight: 500;
        }

        .meta-value {
            font-weight: 700;
            color: #1e293b;
        }

        .invoice-body {
          padding: 10px 40px 20px 40px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .tbl-wrap {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: var(--theme-color);
          color: white;
          font-size: 11px;
          padding: 12px 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          padding: 10px 15px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
        }

        .summary-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .summary-box {
            width: 320px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 20px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
        }

        .total-box {
          background: var(--theme-color);
          color: white;
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 16px;
        }

        .invoice-bottom {
          padding: 30px 40px 40px 40px;
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        /* --- When custom template image is active --- */
        .has-template-bg .header-content {
          height: 290px;
        }

        .has-template-bg .invoice-meta-container {
          padding-left: 60px;
          padding-right: 60px;
        }

        .has-template-bg .invoice-body {
          padding-left: 60px;
          padding-right: 60px;
        }

        .has-template-bg .invoice-bottom {
          padding-left: 60px;
          padding-right: 60px;
          padding-bottom: 160px;
        }

        .has-template-bg .meta-box {
          background: rgba(255,255,255,0.85);
          border-color: rgba(0,0,0,0.1);
          border-top-color: var(--theme-color);
        }

        .has-template-bg .tbl-wrap {
          border-color: rgba(0,0,0,0.1);
        }

        .has-template-bg .summary-row {
          background: rgba(255,255,255,0.85);
        }

        .has-template-bg .summary-box {
          border-color: rgba(0,0,0,0.1);
        }

        .has-template-bg .terms {
          color: #1e293b;
        }

        .terms {
          font-size: 10px;
          color: #64748b;
          max-width: 50%;
        }
        
        .terms strong {
            color: #1e293b;
            display: block;
            margin-bottom: 6px;
            font-size: 12px;
        }

        .signature {
            text-align: center;
            margin-right: 30px;
        }
        
        .sig-line {
            width: 180px;
            border-top: 1px solid #1e293b;
            padding-top: 8px;
            font-weight: 700;
            font-size: 12px;
            color: #1e293b;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
        }

        .action-btn {
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.2s, transform 0.1s;
        }

        .action-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-print { background: var(--theme-color); color: #fff; }
        .btn-save { background: #1e293b; color: #fff; }
        .btn-whatsapp { background: #25D366; color: #fff; }

        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          .no-print { display: none !important; }

          body {
            margin: 0;
            background: white;
          }

          .invoice {
            margin: 0;
            box-shadow: none;
            height: 297mm;
          }

          th {
            background: var(--theme-color) !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .total-box {
            background: var(--theme-color) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .geo-bg, .geo-top-left-1, .geo-top-left-2, .geo-top-left-3,
          .geo-header-grey, .geo-top-right-badge, .geo-top-right-stripe,
          .geo-bottom-left-1, .geo-bottom-left-2, .geo-bottom-left-3,
          .geo-bottom-right-1, .geo-bottom-right-2, .geo-bottom-right-3 {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
          }

          .invoice-template-bg {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="invoice-print-root">
        <div className="no-print" style={{ textAlign: 'center', padding: '16px' }}>
          <div className="action-buttons">
            <button onClick={printInvoice} className="action-btn btn-print">
              <Printer className="w-4 h-4 inline-block" /> Print Invoice
            </button>
            <button onClick={saveBillAsPDF} className="action-btn btn-save">
              <Download className="w-4 h-4 inline-block" /> Save Bill
            </button>
            <button onClick={sendViaWhatsApp} className="action-btn btn-whatsapp">
              <MessageCircle className="w-4 h-4 inline-block" /> Send via WhatsApp
            </button>
            {onNewOrder && (
              <button onClick={onNewOrder} className="action-btn btn-new" style={{ background: '#0f172a', color: 'white' }}>
                <Plus className="w-4 h-4 inline-block" /> New Bill
              </button>
            )}
          </div>
        </div>

        <div className={`invoice${imgLoaded ? ' has-template-bg' : ''}`} ref={invoiceRef}>
          {!imgFailed && (
            <img 
              src={imgSrc} 
              alt="Invoice Background" 
              className="invoice-template-bg" 
              onLoad={() => setImgLoaded(true)}
              onError={handleImgError}
            />
          )}

          {!imgLoaded && (
            <>
              {/* --- Geometric Background Elements --- */}
              {/* Top Left */}
              <div className="geo-bg geo-top-left-1" />
              <div className="geo-bg geo-top-left-2" />
              <div className="geo-bg geo-top-left-3">
                <img
                  src={logoCandidates[0]}
                  alt="Logo"
                  className="shop-logo"
                  onError={(event) => {
                    const fallbackIndex = Number(event.currentTarget.dataset.logoFallbackIndex || 0);
                    const nextIndex = fallbackIndex + 1;
                    if (nextIndex < logoCandidates.length) {
                      event.currentTarget.dataset.logoFallbackIndex = String(nextIndex);
                      event.currentTarget.setAttribute('src', logoCandidates[nextIndex]);
                    } else {
                      event.currentTarget.style.display = 'none';
                    }
                  }}
                />
              </div>

              {/* Header Bar */}
              <div className="geo-bg geo-header-grey" />

              {/* Top Right */}
              <div className="geo-bg geo-top-right-badge">
                <span style={{ color: 'white', fontSize: '36px', fontFamily: 'Lora' }}>Invoice</span>
              </div>
              <div className="geo-bg geo-top-right-stripe" />

              {/* Bottom Left */}
              <div className="geo-bg geo-bottom-left-1" />
              <div className="geo-bg geo-bottom-left-2" />
              <div className="geo-bg geo-bottom-left-3" />

              {/* Bottom Right */}
              <div className="geo-bg geo-bottom-right-1" />
              <div className="geo-bg geo-bottom-right-2" />
              <div className="geo-bg geo-bottom-right-3" />
            </>
          )}

          {/* --- Foreground Content --- */}
          <div className="content-layer">
            <div className="header-content">
              {!imgLoaded && (
                <div className="header-text">
                  <div className="shop-title">{tpl.headerTitle}</div>
                  <div className="shop-address">{tpl.address}</div>
                  <div className="shop-contact">{tpl.phone} | {tpl.hotline}</div>
                </div>
              )}
            </div>

            <div className="invoice-meta-container">
              <div className="meta-box">
                <div className="meta-row"><span className="meta-label">Invoice No:</span> <span className="meta-value">{bill?.bill_number || bill?.invoice_number || 'N/A'}</span></div>
                <div className="meta-row"><span className="meta-label">Date:</span> <span className="meta-value">{fmtDate(bill?.created_at)}</span></div>
                <div className="meta-row"><span className="meta-label">Payment Mode:</span> <span className="meta-value">{
                  bill?.payment_method === 'advance'
                    ? (bill.advance_payment_method
                      ? `ADVANCE (${bill.advance_payment_method === 'bank_transfer' ? 'ONLINE' : bill.advance_payment_method.replace('_', ' ').toUpperCase()})`
                      : 'ADVANCE')
                    : (bill?.payment_method
                      ? (bill.payment_method === 'bank_transfer' ? 'ONLINE' : String(bill.payment_method).replace('_', ' ').toUpperCase())
                      : '-')
                }</span></div>
              </div>
              <div className="meta-box">
                <div className="meta-row"><span className="meta-label">Billed To:</span> <span className="meta-value">{bill?.customer_name || 'Walk-in Customer'}</span></div>
                <div className="meta-row"><span className="meta-label">Contact:</span> <span className="meta-value">{bill?.customer_phone || '-'}</span></div>
              </div>
            </div>

            <div className="invoice-body">
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ textAlign: 'left' }}>Description</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Size</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Price</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Amount</th>
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
                          <td style={{ textAlign: 'center' }}>{i + 1}</td>
                          <td>
                            {catName && (
                              <div style={{ fontSize: '10px', color: 'var(--theme-color)', fontWeight: 600, marginBottom: '2px' }}>
                                {catName}
                              </div>
                            )}
                            <div>{getCleanDescription(item.description, item.size || item.variant?.size || item.stock_item?.variant?.size || item.stockItem?.variant?.size)}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.size || item.variant?.size || item.stock_item?.variant?.size || item.stockItem?.variant?.size || (item.description ? (item.description.match(/\b(\d+(\.\d+)?\s*["″xX]\s*\d*(\.\d+)?["″]?)\b/)?.[1] || '-') : '-')}</td>
                          <td style={{ textAlign: 'right' }}>{fmtMoney(price)}</td>
                          <td style={{ textAlign: 'center' }}>{qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmtMoney(line)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="summary-wrap">
                <div className="summary-box">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>{fmtMoney(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="summary-row" style={{ color: '#dc2626' }}>
                      <span>Discount</span>
                      <span>-{fmtMoney(discount)}</span>
                    </div>
                  )}
                  <div className="total-box">
                    <span>Net Total</span>
                    <span>{fmtMoney(total)}</span>
                  </div>
                  {balanceDue > 0 ? (
                    <>
                      {advancePaid > 0 && (
                        <div className="summary-row" style={{ color: '#059669', background: '#f0fdf4' }}>
                          <span>Advance Paid</span>
                          <span>{fmtMoney(advancePaid)}</span>
                        </div>
                      )}
                      {paidAmount > 0 && (
                        <div className="summary-row" style={{ color: '#059669', background: '#f0fdf4' }}>
                          <span>Balance Payment</span>
                          <span>{fmtMoney(paidAmount)}</span>
                        </div>
                      )}
                      <div className="summary-row" style={{ color: '#dc2626', background: '#fef2f2', fontWeight: 'bold' }}>
                        <span>Balance Due</span>
                        <span>{fmtMoney(balanceDue)}</span>
                      </div>
                    </>
                  ) : (
                    (advancePaid + paidAmount) > 0 && (
                      <div className="summary-row" style={{ color: '#059669', background: '#f0fdf4', fontWeight: 'bold', justifyContent: 'center' }}>
                        <span>✓ FULLY PAID</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="invoice-bottom">
              <div className="terms">
                <strong>Terms &amp; Conditions</strong>
                <div style={{ whiteSpace: 'pre-line' }}>
                  {cfg.termsConditions || cfg.invoice_terms || 'Goods once sold are not refundable or exchangeable.\nThe company is not responsible for any damages after delivery.'}
                </div>
              </div>
              <div className="signature">
                <div className="sig-line">Received By:</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
