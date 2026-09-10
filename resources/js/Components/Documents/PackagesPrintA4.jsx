import React from 'react';
import StudioGoldTemplate from './StudioGoldTemplate';

export default function PackagesPrintA4({
    number = 'PROPOSAL',
    date = '',
    customerName = 'Valued Customer',
    items = [],
    shopSettings = {},
}) {
    const fmtMoney = (val) => Number(val ?? 0).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const packages = Array.isArray(items) ? items : [items];

    return (
        <StudioGoldTemplate
            title="PACKAGE PROPOSAL"
            number={number}
            date={date}
            customerName={customerName}
            shopSettings={shopSettings}
            termsConditions={shopSettings.termsConditions}
            paymentInfo={shopSettings.paymentInfo}
        >
            <div className="sg-packages-list" style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '10px' }}>
                {packages.map((pkg, idx) => {
                    const services = pkg.services || [];
                    const deliverables = pkg.deliverables || [];

                    return (
                        <div key={pkg.id || idx} className="sg-package-card" style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '20px', background: '#ffffff', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div style={{ background: '#0f172a', padding: '10px 16px', borderRadius: '6px', color: '#ffffff', display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '1px' }}>
                                    {pkg.name.toUpperCase()}
                                </span>
                                <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: 'auto' }}>
                                    {pkg.category || pkg.event_type}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #c9a84c', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                        WHAT IS INCLUDED
                                    </h4>
                                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {services.map((svc, sIdx) => {
                                            const sName = typeof svc === 'string' ? svc : (svc?.name ?? '');
                                            if (!sName) return null;
                                            return (
                                                <li key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: '#475569' }}>
                                                    <span style={{ color: '#c9a84c', fontWeight: 'bold' }}>•</span>
                                                    <span>{sName}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #c9a84c', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                        DELIVERABLES
                                    </h4>
                                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {deliverables.map((del, dIdx) => (
                                            <li key={dIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: '#475569' }}>
                                                <span style={{ color: '#c9a84c', fontWeight: 'bold' }}>✓</span>
                                                <span>{del}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginRight: '10px' }}>TOTAL PRICE</span>
                                <div style={{ background: '#f1f5f9', padding: '6px 16px', borderRadius: '4px', color: '#0f172a', fontWeight: '700', fontSize: '14px', borderLeft: '3px solid #c9a84c' }}>
                                    LKR {fmtMoney(pkg.total_price)}
                                </div>
                            </div>

                            {pkg.notes && (
                                <div style={{ marginTop: '12px', padding: '10px', background: '#fafafa', borderRadius: '4px', fontSize: '11px', color: '#64748b', fontStyle: 'italic', border: '1px solid #f1f5f9' }}>
                                    <strong>Note:</strong> {pkg.notes}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </StudioGoldTemplate>
    );
}
