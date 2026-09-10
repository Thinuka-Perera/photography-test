import { useEffect, useRef } from 'react';
import { Printer, Download, MessageCircle, Plus } from 'lucide-react';
import { generatePDFFromElement, sharePDFOnWhatsApp } from '@/utils/pdfGenerator';
import StudioGoldTemplate from '@/Components/Documents/StudioGoldTemplate';
import { getCleanDescription } from '@/utils/format';

export default function BillPrintA4({ bill, settings, invoiceSettings, shopInfo, onNewOrder }) {
  const cfg = { ...(shopInfo || {}), ...(invoiceSettings || {}), ...(settings || {}) };
  const items = bill?.items ?? [];

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
      const filename = `Invoice_${bill?.bill_number ?? 'BILL'}.pdf`;
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
      const filename = `Invoice_${bill?.bill_number ?? 'BILL'}.pdf`;
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

  // Construct summary rows for template
  const summaryRows = [
    { label: 'Subtotal', value: subtotal },
    { label: 'Discount', value: discount },
    { label: 'TOTAL AMOUNT', value: total, highlight: true },
  ];

  if (balanceDue > 0) {
    if (advancePaid > 0) {
      summaryRows.push({ label: 'Advance Paid', value: advancePaid, bold: true, color: '#059669' });
    }
    if (paidAmount > 0) {
      summaryRows.push({ label: 'Balance Payment', value: paidAmount, bold: true, color: '#059669' });
    }
    summaryRows.push({ label: 'Balance Due', value: balanceDue, bold: true, color: '#dc2626' });
  } else if ((advancePaid + paidAmount) > 0) {
    // Simply indicate fully paid status
  }

  return (
    <>
      <style>{`
        body {
          margin: 0;
          background: #eee;
        }
        :root {
          --print-scale: 1;
        }
        .invoice-print-root {
          background: #eee;
          min-height: 100vh;
          padding: 0;
        }
        .invoice {
          transform: scale(var(--print-scale));
          transform-origin: top center;
        }
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
            height: auto;
            min-height: auto;
            transform: none !important;
          }
        }
      `}</style>

      <div className="invoice-print-root">
        <div className="no-print" style={{ textAlign: 'center', padding: '16px' }}>
          <div className="action-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={printInvoice} className="action-btn btn-print" style={{ border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#C9A84C', color: '#fff' }}>
              <Printer className="w-4 h-4 inline-block" />
              Print Invoice
            </button>

            <button onClick={saveBillAsPDF} className="action-btn btn-save" style={{ border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1e293b', color: '#fff' }}>
              <Download className="w-4 h-4 inline-block" />
              Save Bill
            </button>

            <button onClick={sendViaWhatsApp} className="action-btn btn-whatsapp" style={{ border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25D366', color: '#fff' }}>
              <MessageCircle className="w-4 h-4 inline-block" />
              Send via WhatsApp
            </button>

            {onNewOrder && (
              <button onClick={onNewOrder} className="action-btn btn-new" style={{ border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: 'white' }}>
                <Plus className="w-4 h-4 inline-block" />
                New Bill
              </button>
            )}
          </div>
        </div>

        <div className="invoice" ref={invoiceRef}>
          <StudioGoldTemplate
            title="INVOICE"
            number={bill?.bill_number ?? 'N/A'}
            date={bill?.created_at}
            customerName={bill?.customer_name || 'Walk-in'}
            customerPhone={bill?.customer_phone}
            summaryRows={summaryRows}
            shopSettings={cfg}
          >
            <table className="sg-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="sg-th" style={{ width: '58px' }}>SL.</th>
                  <th className="sg-th">Item Description</th>
                  <th className="sg-th" style={{ width: '80px' }}>Size</th>
                  <th className="sg-th" style={{ width: '100px', textAlign: 'right' }}>Price</th>
                  <th className="sg-th" style={{ width: '70px', textAlign: 'right' }}>Qty.</th>
                  <th className="sg-th" style={{ width: '110px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const qty = Number(item.quantity ?? item.qty ?? 0);
                  const price = Number(item.unit_price ?? item.price ?? 0);
                  const line = Number(item.line_total ?? qty * price);
                  const hasDiscount = Number(item.discount_amount || 0) > 0;
                  const size = item.size || item.variant?.size || item.stock_item?.variant?.size || item.stockItem?.variant?.size || (item.description ? (item.description.match(/\b(\d+(\.\d+)?\s*["″xX]\s*\d*(\.\d+)?["″]?)\b/)?.[1] || '-') : '-');

                  const catName = item.category?.name || item.category_name || item.stock_item?.variant?.product?.category?.name || item.stockItem?.variant?.product?.category?.name;

                  return (
                    <tr key={item.id ?? i}>
                      <td className="sg-td" style={{ width: '58px' }}>{i + 1}</td>
                      <td className="sg-td">
                        {catName && (
                          <div style={{ fontSize: '10px', color: '#c9a84c', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
                            {catName}
                          </div>
                        )}
                        <div>{getCleanDescription(item.description, size)}</div>
                        {hasDiscount && (
                          <div style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                            Discount: -{fmtMoney(item.discount_amount)}
                          </div>
                        )}
                      </td>
                      <td className="sg-td">{size}</td>
                      <td className="sg-td" style={{ width: '100px', textAlign: 'right' }}>{fmtMoney(price)}</td>
                      <td className="sg-td" style={{ width: '70px', textAlign: 'right' }}>{qty}</td>
                      <td className="sg-td" style={{ width: '110px', textAlign: 'right' }}>{fmtMoney(line)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {balanceDue <= 0 && (advancePaid + paidAmount) > 0 && (
              <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#059669', padding: '6px', backgroundColor: '#dcfce7', borderRadius: '4px', textAlign: 'center', width: '280px', alignSelf: 'flex-end' }}>
                Status: FULLY PAID ✓
              </div>
            )}
          </StudioGoldTemplate>
        </div>
      </div>
    </>
  );
}
