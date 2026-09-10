import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function StudioGoldTemplate({
    title = 'DOCUMENT',
    number = 'N/A',
    date = '',
    customerName = 'Walk-in Customer',
    customerPhone = '',
    metaRows = [],
    summaryRows = [],
    shopSettings = {},
    paymentInfo = '',
    termsConditions = '',
    signatureLabel = null,
    children,
}) {
    const cfg = shopSettings || {};
    const resolvedSignatureLabel = signatureLabel !== null
        ? signatureLabel
        : (title?.toUpperCase().includes('QUOTATION') ? 'Prepared By:' : 'Received By:');

    const logoCandidates = [
        cfg.shop_logo_url,
        cfg.logoUrl,
        cfg.shop_logo ? `/storage/${String(cfg.shop_logo).replace(/^\/?storage\//, '')}` : null,
        '/Logo.png',
    ].filter(Boolean);

    const fmtMoney = (val) => Number(val ?? 0).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const fmtDate = (val) => {
        if (!val) return 'N/A';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return val;
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd} / ${mm} / ${yyyy}`;
        } catch (e) {
            return val;
        }
    };

    const termsText = termsConditions || cfg.termsConditions || cfg.invoice_terms || 'Goods once sold are not refundable or exchangeable.\nThe company is not responsible for any damages after delivery.';
    const resolvedPaymentInfo = paymentInfo || cfg.paymentInfo || cfg.invoice_payment_info || '';

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Playfair+Display:wght@500;700&family=Dancing+Script:wght@600&display=swap');

        .sg-invoice-wrapper {
          box-sizing: border-box;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          color: #1e293b;
          background: white;
        }

        .sg-invoice {
          width: 210mm;
          min-height: auto;
          margin: auto;
          background: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sg-inv-header {
          flex-shrink: 0;
          padding: 16px 30px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .sg-inv-head {
          display: flex;
          justify-content: space-between;
        }

        .sg-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          white-space: nowrap;
        }

        .sg-brand-sub {
          font-size: 10px;
          color: #c9a84c;
          letter-spacing: 3px;
        }

        .sg-inv-title {
          font-size: 30px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .sg-gold-rule {
          height: 2px;
          background: #c9a84c;
          margin-top: 10px;
        }

        .sg-invoice-body {
          flex: 0 0 auto;
          padding: 0 30px;
          display: flex;
          flex-direction: column;
          padding-bottom: 8px;
        }

        .sg-tbl-wrap {
          flex: 0 0 auto;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .sg-table-body {
          flex: 0 0 auto;
          overflow: hidden;
        }

        .sg-table {
          width: 100%;
          border-collapse: collapse;
        }

        .sg-th {
          background: black;
          color: #c9a84c;
          font-size: 11px;
          padding: 8px;
          text-align: left;
        }

        .sg-td {
          padding: 6px 8px;
          border-bottom: 1px solid #eee;
          font-size: 13px;
        }

        .sg-summary-wrap {
          flex-shrink: 0;
          margin-top: 10px;
          width: 280px;
          align-self: flex-end;
        }

        .sg-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 4px 0;
        }

        .sg-total-box {
          background: #c9a84c;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
          font-weight: bold;
          font-size: 16px;
          color: white;
        }

        .sg-invoice-bottom {
          flex-shrink: 0;
          display: flex;
          justify-content: space-between;
          padding: 16px 30px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .sg-thank {
          font-family: 'Dancing Script', cursive;
          font-size: 28px;
          color: #c9a84c;
        }

        .sg-sub {
          font-size: 10px;
          letter-spacing: 2px;
        }

        .sg-terms {
          font-size: 12.5px;
          margin-top: 10px;
          max-width: 300px;
          white-space: pre-line;
          color: #64748b;
        }

        .sg-pay-title {
          font-weight: 600;
          margin-bottom: 5px;
        }

        .sg-bottom-right div {
          font-size: 12.5px;
          color: #64748b;
        }

        .sg-footer {
          flex-shrink: 0;
          display: flex;
          justify-content: space-around;
          font-size: 10px;
          padding: 10px;
          border-top: 1px solid #eee;
          page-break-inside: avoid;
          break-inside: avoid;
          color: #94a3b8;
        }
      `}</style>

            <div className="sg-invoice-wrapper">
                <div className="sg-invoice">
                    <div className="sg-inv-header">
                        <div className="sg-inv-head">
                            <div className="sg-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <img
                                    src={logoCandidates[0]}
                                    alt="Shop Logo"
                                    style={{ height: '48px', marginBottom: '8px', objectFit: 'contain' }}
                                    onError={(event) => {
                                        const fallbackIndex = Number(event.currentTarget.dataset.logoFallbackIndex || 0);
                                        const nextIndex = fallbackIndex + 1;

                                        if (nextIndex < logoCandidates.length) {
                                            event.currentTarget.dataset.logoFallbackIndex = String(nextIndex);
                                            event.currentTarget.setAttribute('src', logoCandidates[nextIndex]);
                                        } else {
                                            event.currentTarget.onerror = null;
                                            event.currentTarget.style.display = 'none';
                                        }
                                    }}
                                />
                                <div className="sg-brand-name">{cfg.shop_name || cfg.name || 'Photography Shop'}</div>
                                {(cfg.show_tagline ?? true) && (
                                    <div className="sg-brand-sub">{cfg.shop_tagline || cfg.tagline || 'PHOTOGRAPHY'}</div>
                                )}
                            </div>

                            <div className="sg-inv-meta">
                                <div className="sg-inv-title">{title}</div>
                                <div className="sg-meta-row" style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px', marginTop: '4px' }}>
                                    <span>Number</span>
                                    <strong>{number}</strong>
                                </div>
                                <div className="sg-meta-row" style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px', marginTop: '2px' }}>
                                    <span>Date</span>
                                    <strong>{fmtDate(date || new Date())}</strong>
                                </div>
                                <div className="sg-meta-row" style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px', marginTop: '2px' }}>
                                    <span>Customer</span>
                                    <strong>{customerName || 'Walk-in'}</strong>
                                </div>
                                {customerPhone && (
                                    <div className="sg-meta-row" style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px', marginTop: '2px' }}>
                                        <span>Contact No.</span>
                                        <strong>{customerPhone}</strong>
                                    </div>
                                )}
                                {metaRows.map((row, idx) => (
                                    <div key={idx} className="sg-meta-row" style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px', marginTop: '2px' }}>
                                        <span>{row.label}</span>
                                        <strong>{row.value || '-'}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="sg-gold-rule" />
                    </div>

                    <div className="sg-invoice-body">
                        <div className="sg-tbl-wrap">
                            {children}

                            {summaryRows.length > 0 && (
                                <div className="sg-summary-wrap">
                                    {summaryRows.map((row, idx) => {
                                        if (row.highlight) {
                                            return (
                                                <div key={idx} className="sg-total-box">
                                                    <span>{row.label.toUpperCase()}</span>
                                                    <strong>{fmtMoney(row.value)}</strong>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={idx} className="sg-summary-row" style={row.bold ? { fontWeight: 'bold', color: row.color || 'inherit' } : { color: row.color || 'inherit' }}>
                                                <span>{row.label}</span>
                                                <span>{fmtMoney(row.value)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="sg-invoice-bottom">
                        <div className="sg-bottom-left">
                            <div className="sg-thank">Thank you</div>
                            <div className="sg-sub">FOR YOUR BUSINESS</div>

                            <div className="sg-terms">
                                {termsText}
                            </div>
                        </div>

                        <div className="sg-bottom-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <div>
                                <div className="sg-pay-title">Payment Information</div>
                                {resolvedPaymentInfo ? (
                                    <div style={{ whiteSpace: 'pre-line' }}>{resolvedPaymentInfo}</div>
                                ) : (
                                    <>
                                        <div>Account No: {cfg.bank_account_no || cfg.bankAccount || '-'}</div>
                                        <div>Account Name: {cfg.account_name || cfg.accountName || '-'}</div>
                                        <div>Bank: {cfg.bank_details || cfg.bankDetails || '-'}</div>
                                    </>
                                )}
                            </div>

                            {resolvedSignatureLabel && (
                                <div style={{ marginTop: '24px', textAlign: 'center', width: '180px' }}>
                                    <div style={{ borderBottom: '1px solid #475569', marginBottom: '6px' }}></div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>
                                        {resolvedSignatureLabel}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="sg-footer">
                        {(cfg.show_phone !== false) && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {cfg.shop_phone || cfg.phone || '-'}</span>}
                        {(cfg.show_email !== false) && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {cfg.shop_email || cfg.email || '-'}</span>}
                        {(cfg.show_address !== false) && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {cfg.shop_address || cfg.address || '-'}</span>}
                    </div>
                </div>
            </div>
        </>
    );
}
