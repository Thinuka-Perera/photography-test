import React from 'react';
import StudioGoldTemplate from './StudioGoldTemplate';

export default function EventPrintA4({
    event = {},
    paymentSummary = {},
    photographyPkgs = [],
    videographyPkgs = [],
    customSections = [],
    shopSettings = {},
}) {
    const fmtMoney = (val) => Number(val ?? 0).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const parseEventNotes = (notesText) => {
        if (!notesText) return { packageNote: '', includedServices: '', deliverables: '', generalNotes: '' };

        const lines = notesText.split('\n');
        let packageNote = '';
        let includedServices = '';
        let deliverables = '';
        const generalLines = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (/^Package Note:/i.test(trimmed)) {
                packageNote = trimmed.replace(/^Package Note:\s*/i, '').trim();
            } else if (/^Included Services:/i.test(trimmed)) {
                includedServices = trimmed.replace(/^Included Services:\s*/i, '').trim();
            } else if (/^Deliverables:/i.test(trimmed)) {
                deliverables = trimmed.replace(/^Deliverables:\s*/i, '').trim();
            } else {
                generalLines.push(line);
            }
        });

        return {
            packageNote,
            includedServices,
            deliverables,
            generalNotes: generalLines.join('\n').trim()
        };
    };

    const parsedNotes = parseEventNotes(event.notes);
    const totalAmount = Number(paymentSummary.total_amount ?? event.total_amount ?? 0);
    const receivedAmount = Number(paymentSummary.received_amount ?? event.received_amount ?? 0);
    const balanceAmount = Number(paymentSummary.balance_amount ?? Math.max(0, totalAmount - receivedAmount));

    // Keep header metaRows empty to match the compact header of Image 1 exactly.
    const metaRows = [];

    // Summary Rows for the right aligned financial box
    const summaryRows = [
        { label: 'Amount', value: totalAmount, highlight: true },
        { label: 'Received', value: receivedAmount, bold: true },
        { label: 'Balance Due', value: balanceAmount, bold: true, color: '#dc2626' },
    ];

    const services = parsedNotes.includedServices ? parsedNotes.includedServices.split(',').map(s => s.trim()).filter(Boolean) : [];
    const deliverables = parsedNotes.deliverables ? parsedNotes.deliverables.split(',').map(d => d.trim()).filter(Boolean) : [];

    // Compile items for the package / service table
    const tableItems = [];
    if (photographyPkgs.length > 0) {
        photographyPkgs.forEach(pkg => {
            tableItems.push({
                description: `📷 Photography: ${pkg.name}`,
                notes: pkg.notes,
                price: pkg.amount,
                qty: 1,
                total: pkg.amount
            });
        });
    }
    if (videographyPkgs.length > 0) {
        videographyPkgs.forEach(pkg => {
            tableItems.push({
                description: `🎥 Videography: ${pkg.name}`,
                notes: pkg.notes,
                price: pkg.amount,
                qty: 1,
                total: pkg.amount
            });
        });
    }

    // Default row if no packages selected, using the event booking fee
    if (tableItems.length === 0) {
        tableItems.push({
            description: `${event.event_type ? (event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)) : 'Event'} Booking Package`,
            notes: parsedNotes.generalNotes || 'Main package selection',
            price: totalAmount,
            qty: 1,
            total: totalAmount
        });
    }

    return (
        <StudioGoldTemplate
            title={(event.event_type || 'EVENT').toUpperCase()}
            number={`EVT-${event.id}`}
            date={event.event_date}
            customerName={event.client_name || 'Client'}
            customerPhone={event.client_phone || '-'}
            metaRows={metaRows}
            summaryRows={summaryRows}
            shopSettings={shopSettings}
            termsConditions={shopSettings.termsConditions}
            paymentInfo={shopSettings.paymentInfo}
        >
            <div className="sg-event-details-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>

                {/* Event Schedule & Locations Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    backgroundColor: '#fafafa',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    fontSize: '13px'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                        <span style={{ color: '#64748b' }}>Location:</span>
                        <strong style={{ color: '#0f172a' }}>{event.location || '-'}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                        <span style={{ color: '#64748b' }}>Expected Guests:</span>
                        <strong style={{ color: '#0f172a' }}>{event.expected_guests || '-'}</strong>
                    </div>
                    {event.wedding_location && (
                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                            <span style={{ color: '#64748b' }}>Wedding Loc:</span>
                            <strong style={{ color: '#0f172a' }}>{event.wedding_location}</strong>
                        </div>
                    )}
                    {event.saloon_location && (
                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                            <span style={{ color: '#64748b' }}>Saloon Loc:</span>
                            <strong style={{ color: '#0f172a' }}>{event.saloon_location}</strong>
                        </div>
                    )}
                    {event.photo_shoot_location && (
                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                            <span style={{ color: '#64748b' }}>Shoot Loc:</span>
                            <strong style={{ color: '#0f172a' }}>{event.photo_shoot_location}</strong>
                        </div>
                    )}
                </div>

                {/* Items / Booking Table */}
                <table className="sg-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr>
                            <th className="sg-th" style={{ width: '58px' }}>SL.</th>
                            <th className="sg-th">Item Description</th>
                            <th className="sg-th" style={{ width: '120px', textAlign: 'right' }}>Price</th>
                            <th className="sg-th" style={{ width: '70px', textAlign: 'right' }}>Qty.</th>
                            <th className="sg-th" style={{ width: '120px', textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableItems.map((item, idx) => (
                            <tr key={idx}>
                                <td className="sg-td" style={{ width: '58px' }}>{idx + 1}</td>
                                <td className="sg-td">
                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.description}</div>
                                    {item.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.notes}</div>}
                                </td>
                                <td className="sg-td" style={{ width: '120px', textAlign: 'right' }}>{fmtMoney(item.price)}</td>
                                <td className="sg-td" style={{ width: '70px', textAlign: 'right' }}>{item.qty}</td>
                                <td className="sg-td" style={{ width: '120px', textAlign: 'right' }}>{fmtMoney(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Package Inclusions & Deliverables */}
                {(services.length > 0 || deliverables.length > 0 || parsedNotes.packageNote) && (
                    <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '16px', background: '#fafafa', marginTop: '10px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '700', borderBottom: '1.5px solid #c9a84c', paddingBottom: '4px', marginBottom: '10px', color: '#0f172a' }}>
                            PACKAGE DETAILS
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {services.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>INCLUDED SERVICES</h4>
                                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {services.map((svc, i) => (
                                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                                                <span style={{ color: '#c9a84c' }}>•</span>
                                                <span>{svc}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {deliverables.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>DELIVERABLES</h4>
                                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {deliverables.map((del, i) => (
                                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                                                <span style={{ color: '#c9a84c' }}>✓</span>
                                                <span>{del}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {parsedNotes.packageNote && (
                            <div style={{ marginTop: '12px', paddingLeft: '8px', borderLeft: '2px solid #c9a84c', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                                Note: {parsedNotes.packageNote}
                            </div>
                        )}
                    </div>
                )}

                {customSections.map((sect, sIdx) => (
                    <div key={sIdx} style={{ marginTop: '10px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '700', borderBottom: '1.5px solid #c9a84c', paddingBottom: '4px', marginBottom: '10px', color: '#0f172a' }}>
                            {(sect.title || 'Details').toUpperCase()}
                        </h3>
                        <table className="sg-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {(sect.rows || []).map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        <td className="sg-td" style={{ fontWeight: '500' }}>{row.label}</td>
                                        <td className="sg-td" style={{ textAlign: 'right', fontWeight: '600' }}>{row.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}

                {parsedNotes.generalNotes && (
                    <div style={{ marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>GENERAL NOTES</h4>
                        <div style={{ fontSize: '12px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                            {parsedNotes.generalNotes}
                        </div>
                    </div>
                )}
            </div>
        </StudioGoldTemplate>
    );
}
