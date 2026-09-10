import React from 'react';
import StudioGoldTemplate from './StudioGoldTemplate';
import { getCleanDescription } from '@/utils/format';

export default function QuotationPrintA4({
    type = 'QUOTATION',
    number = 'DRAFT',
    date = '',
    customerName = 'Walk-in Customer',
    customerPhone = '',
    items = [],
    subtotal = 0,
    discount = 0,
    total = 0,
    notes = '',
    event_type = '',
    shopSettings = {},
    variant = 'default',
}) {
    const fmtMoney = (val) => Number(val ?? 0).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const metaRows = [];
    if (event_type) {
        metaRows.push({ label: 'Event Type', value: event_type });
    }

    const summaryRows = [
        { label: 'Subtotal', value: subtotal },
        { label: 'Discount', value: discount },
        { label: 'TOTAL AMOUNT', value: total, highlight: true },
    ];

    return (
        <StudioGoldTemplate
            title={type.toUpperCase()}
            number={number}
            date={date}
            customerName={customerName}
            customerPhone={customerPhone}
            metaRows={metaRows}
            summaryRows={summaryRows}
            shopSettings={shopSettings}
            termsConditions={shopSettings.termsConditions}
            paymentInfo={shopSettings.paymentInfo}
        >
            <table className="sg-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                    <tr>
                        <th className="sg-th" style={{ width: '58px' }}>SL.</th>
                        <th className="sg-th">Item Description</th>
                        <th className="sg-th" style={{ width: '80px' }}>Size</th>
                        <th className="sg-th" style={{ width: '120px', textAlign: 'right' }}>Unit Price</th>
                        <th className="sg-th" style={{ width: '70px', textAlign: 'right' }}>Qty.</th>
                        <th className="sg-th" style={{ width: '120px', textAlign: 'right' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, i) => {
                        const qty = Number(item.quantity ?? item.qty ?? 0);
                        const price = Number(item.unit_price ?? item.price ?? 0);
                        const line = Number(item.line_total ?? qty * price);

                        return (
                            <tr key={item.id ?? i}>
                                <td className="sg-td" style={{ width: '58px' }}>{i + 1}</td>
                                <td className="sg-td">{getCleanDescription(item.description, item.size || item.variant?.size || item.stock_item?.variant?.size || item.stockItem?.variant?.size)}</td>
                                <td className="sg-td">{item.size || item.variant?.size || item.stock_item?.variant?.size || item.stockItem?.variant?.size || (item.description ? (item.description.match(/\b(\d+(\.\d+)?\s*["″xX]\s*\d*(\.\d+)?["″]?)\b/)?.[1] || '-') : '-')}</td>
                                <td className="sg-td" style={{ width: '120px', textAlign: 'right' }}>{fmtMoney(price)}</td>
                                <td className="sg-td" style={{ width: '70px', textAlign: 'right' }}>{qty}</td>
                                <td className="sg-td" style={{ width: '120px', textAlign: 'right' }}>{fmtMoney(line)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {notes && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderLeft: '3px solid #c9a84c', borderRadius: '4px', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                    <strong>Notes: </strong> {notes}
                </div>
            )}
        </StudioGoldTemplate>
    );
}
