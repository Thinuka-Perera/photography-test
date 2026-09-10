<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            background: #f1f5f9;
            color: #222;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* ── Print bar (hidden when printing) ── */
        .print-bar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 999;
            background: #1e293b; color: #fff;
            padding: 10px 24px;
            display: flex; align-items: center; justify-content: space-between;
            font-family: Arial, sans-serif; font-size: 13px;
        }
        .print-bar strong { color: #facc15; }
        .print-bar .actions { display: flex; gap: 10px; }
        .btn-print { background: #facc15; color: #111; border: none; border-radius: 6px; padding: 8px 20px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-print:hover { background: #eab308; }
        .btn-close { background: transparent; color: #94a3b8; border: 1px solid #334155; border-radius: 6px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
        .btn-close:hover { color: #fff; }

        .page-wrap { padding-top: 58px; }
        @media print {
            .print-bar { display: none !important; }
            .page-wrap { padding-top: 0; }
            body { background: #fff; }
        }
    </style>

@if(isset($paperSize) && $paperSize === '80mm')
{{-- ═══════════════════════════════════════════════════════
     80mm THERMAL RECEIPT STYLES
     Compact, single-page, designed for thermal printers
═══════════════════════════════════════════════════════ --}}
<style>
    @media print {
        @page {
            size: 80mm auto;
            margin: 3mm 2mm 5mm 2mm;
        }
    }

    .receipt {
        width: 76mm;
        margin: 10px auto;
        background: #fff;
        padding: 6px 4px;
        font-size: 11px;
        line-height: 1.4;
        color: #111;
    }
    @media print {
        .receipt { margin: 0; padding: 0; width: 76mm; }
        body { background: #fff; }
    }

    /* Shop header */
    .r-shop-name {
        text-align: center; font-size: 14px; font-weight: 900;
        text-transform: uppercase; letter-spacing: 1px;
        border-bottom: 2px solid #111; padding-bottom: 4px; margin-bottom: 4px;
    }
    .r-shop-sub {
        text-align: center; font-size: 9px; color: #555; line-height: 1.5;
        border-bottom: 1px dashed #999; padding-bottom: 5px; margin-bottom: 6px;
    }

    /* INVOICE title */
    .r-title {
        text-align: center; font-size: 13px; font-weight: 900;
        letter-spacing: 3px; color: #111;
        border: 2px solid #111; padding: 3px 0;
        margin-bottom: 6px;
        background: #f5f5f5;
    }

    /* Meta rows */
    .r-meta { margin-bottom: 6px; border-bottom: 1px dashed #999; padding-bottom: 5px; }
    .r-meta-row { display: flex; justify-content: space-between; font-size: 10px; padding: 1px 0; }
    .r-meta-label { color: #777; flex-shrink: 0; }
    .r-meta-value { font-weight: 700; text-align: right; }

    /* Customer */
    .r-customer { font-size: 11px; margin-bottom: 5px; border-bottom: 1px dashed #999; padding-bottom: 5px; }
    .r-customer-label { font-size: 9px; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
    .r-customer-name { font-weight: 900; font-size: 12px; }
    .r-customer-phone { font-size: 10px; color: #555; }

    /* Handled By */
    .r-handled-by {
        background: #fffbeb; border: 1px solid #fde68a;
        border-radius: 4px; padding: 4px 6px; margin-bottom: 6px;
        font-size: 10px;
    }
    .r-handled-by-label { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #b45309; }
    .r-handled-by-name  { font-weight: 700; }

    /* Items table */
    .r-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .r-table thead tr { border-top: 2px solid #111; border-bottom: 1px solid #111; }
    .r-table thead th {
        font-size: 9px; font-weight: 900; text-transform: uppercase;
        padding: 3px 2px; text-align: left;
    }
    .r-table thead th.r { text-align: right; }
    .r-table tbody td {
        font-size: 10px; padding: 3px 2px;
        border-bottom: 1px dotted #ddd; vertical-align: top;
    }
    .r-table tbody td.r { text-align: right; }
    .r-table tbody tr:last-child td { border-bottom: 1px solid #111; }
    .r-item-sku { font-size: 8px; color: #888; }

    /* Totals */
    .r-totals { width: 100%; margin-bottom: 6px; }
    .r-totals-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; }
    .r-totals-label { color: #555; }
    .r-totals-value { font-weight: 700; }
    .r-totals-divider { border-top: 1px dashed #999; margin: 3px 0; }
    .r-grand { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; padding: 4px 6px; background: #111; color: #fff; border-radius: 3px; margin-bottom: 6px; }

    /* Terms / Payment */
    .r-section { border-top: 1px dashed #999; padding-top: 5px; margin-bottom: 5px; }
    .r-section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; color: #333; }
    .r-section-body { font-size: 9px; color: #555; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }

    /* Thank you + sign */
    .r-footer { text-align: center; border-top: 2px dashed #111; padding-top: 5px; margin-top: 4px; }
    .r-thankyou { font-size: 11px; font-weight: 700; margin-bottom: 8px; }
    .r-sign-line { width: 90px; border-top: 1px solid #111; margin: 20px auto 2px auto; }
    .r-sign-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
    .r-shop-footer { font-size: 8px; color: #777; margin-top: 4px; }
</style>

@else
{{-- ═══════════════════════════════════════════════════════
     A4 PROFESSIONAL INVOICE STYLES
═══════════════════════════════════════════════════════ --}}
<style>
    @media print {
        @page {
            size: A4 portrait;
            margin: 0;
        }
        .page { box-shadow: none !important; }
    }

    .page {
        width: 210mm;
        min-height: 297mm;
        margin: 10px auto;
        background: #fff;
        box-shadow: 0 0 30px rgba(0,0,0,0.12);
        display: flex;
        flex-direction: column;
    }
    @media print { .page { margin: 0; } }

    /* Yellow bars */
    .top-bar    { height: 10px; background: #facc15; }
    .yellow-rule { height: 8px; background: #facc15; margin: 12px 36px 0 36px; }

    /* Header */
    .a4-header {
        padding: 28px 36px 0 36px;
        display: flex; align-items: flex-start; justify-content: space-between;
    }
    .logo-wrap {
    width: 80px;
    height: 80px;
    border: 2px solid #222;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
    .logo-text {
        font-size: 9px; font-weight: bold; color: #222;
        text-align: center; padding: 4px; line-height: 1.3; text-transform: uppercase;
        word-break: break-all;
    }
    .invoice-title { font-size: 46px; font-weight: 900; color: #222; letter-spacing: 2px; line-height: 1; }

    /* Meta */
    .a4-meta {
        padding: 18px 36px;
        display: flex; justify-content: space-between; align-items: flex-start;
    }
    .bill-to-label { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
    .bill-to-name  { font-size: 14px; color: #444; }
    .bill-to-phone { font-size: 12px; color: #888; margin-top: 2px; }
    .meta-tbl { text-align: right; font-size: 13px; border-collapse: collapse; }
    .meta-tbl .ml { color: #888; padding-right: 16px; }
    .meta-tbl .mv { font-weight: 700; }

    /* Handled By */
    .handled-by-row { padding: 0 36px 10px 36px; }
    .handled-by-badge {
        display: inline-flex; align-items: center; gap: 8px;
        background: #fffbeb; border: 1px solid #fde68a;
        border-radius: 6px; padding: 6px 14px; font-size: 12px;
    }
    .hb-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #b45309; }
    .hb-name  { font-weight: 700; }

    /* Items */
    .items-wrap { padding: 0 36px; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items thead tr { background: #2d2d2d; color: #fff; }
    table.items thead th { padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
    table.items thead th.r { text-align: right; }
    table.items thead th.c { text-align: center; }
    table.items tbody tr:nth-child(odd)  { background: #f9f9f9; }
    table.items tbody tr:nth-child(even) { background: #fff; }
    table.items tbody tr { height: 36px; }
    table.items tbody td { padding: 8px 12px; font-size: 12px; color: #333; vertical-align: middle; border-bottom: 1px solid #eee; }
    table.items tbody td.r { text-align: right; }
    table.items tbody td.c { text-align: center; }

    /* Thank you */
    .thankyou { padding: 14px 36px 0 36px; font-size: 13px; font-weight: 700; }

    /* Bottom */
    .a4-bottom { padding: 14px 36px 0 36px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex: 1; }
    .a4-left  { flex: 1; }
    .a4-right { width: 220px; flex-shrink: 0; }

    .a4-block { margin-bottom: 14px; }
    .a4-block h4 { font-size: 12px; font-weight: 900; color: #222; margin-bottom: 4px; }
    .a4-block p  { font-size: 11px; color: #555; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }

    /* Totals */
    .t-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 5px 0; font-size: 12px; color: #555; border-bottom: 1px solid #eee;
    }
    .t-row .tl { font-weight: 600; }
    .t-row .tv { font-weight: 700; color: #222; }
    .t-grand {
        display: flex; justify-content: space-between; align-items: center;
        background: #facc15; padding: 10px 12px; border-radius: 4px; margin-top: 8px;
    }
    .t-grand .gl { font-size: 15px; font-weight: 900; color: #111; }
    .t-grand .gv { font-size: 15px; font-weight: 900; color: #111; }

    /* Sign */
    .sign-section { text-align: right; padding: 0 36px; margin-top: 20px; }
    .sign-line { width: 140px; border-top: 1.5px solid #222; margin: 48px 0 4px auto; }
    .sign-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Footer */
    .a4-footer { margin-top: auto; padding: 0 36px; }
    .footer-bar { height: 8px; background: #facc15; }
    .footer-txt { padding: 10px 0; font-size: 10px; color: #888; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; }
</style>
@endif

</head>
<body>

{{-- Print controls --}}
<div class="print-bar">
    <span>Printing: <strong>{{ $invoice->invoice_number }}</strong> &nbsp;·&nbsp; {{ $shopName }} &nbsp;·&nbsp; Paper: <strong>{{ $paperSize }}</strong></span>
    <!-- <div class="actions">
        <button class="btn-close" onclick="window.close()">✕ Close</button>
        <button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>
    </div> -->
</div>

<div class="page-wrap">

@php
    $resolvedShopLogoUrl = null;
    if (!empty($shopLogo)) {
        $logoValue = trim((string) $shopLogo);
        if (str_starts_with($logoValue, 'http://') || str_starts_with($logoValue, 'https://') || str_starts_with($logoValue, '/')) {
            $resolvedShopLogoUrl = $logoValue;
        } else {
            $resolvedShopLogoUrl = asset('storage/' . ltrim(preg_replace('#^storage/#', '', $logoValue), '/'));
        }
    } elseif (file_exists(public_path('Logo.png'))) {
        $resolvedShopLogoUrl = asset('Logo.png');
    }
@endphp

@if(isset($paperSize) && $paperSize === '80mm')
{{-- ═══════════════════════════════════════════════════════
     80mm THERMAL RECEIPT LAYOUT
═══════════════════════════════════════════════════════ --}}
<div class="receipt">

    {{-- Shop name --}}
    @if(!empty($resolvedShopLogoUrl))
    <div style="text-align:center;margin-bottom:4px;">
        <img src="{{ $resolvedShopLogoUrl }}" alt="Logo" style="width:22mm;height:22mm;object-fit:contain;">
    </div>
    @endif
    <div class="r-shop-name">{{ $shopName }}</div>
    <div class="r-shop-sub">
        @php $sub = array_filter([$shopAddress, $shopPhone, $shopEmail]); @endphp
        {{ implode(' | ', $sub) }}
    </div>

    {{-- INVOICE title --}}
    <div class="r-title">*** INVOICE ***</div>

    {{-- Invoice meta --}}
    <div class="r-meta">
        <div class="r-meta-row"><span class="r-meta-label">Invoice #</span><span class="r-meta-value">{{ $invoice->invoice_number }}</span></div>
        <div class="r-meta-row"><span class="r-meta-label">Date</span><span class="r-meta-value">{{ $invoice->created_at->format('d/m/Y') }}</span></div>
        @if($invoice->due_date)
        <div class="r-meta-row"><span class="r-meta-label">Due</span><span class="r-meta-value">{{ $invoice->due_date->format('d/m/Y') }}</span></div>
        @endif
        <div class="r-meta-row"><span class="r-meta-label">Status</span><span class="r-meta-value">{{ ucfirst(str_replace('_',' ',$invoice->status)) }}</span></div>
    </div>

    {{-- Customer --}}
    <div class="r-customer">
        <div class="r-customer-label">Bill To</div>
        <div class="r-customer-name">{{ $invoice->customer_name }}</div>
        @if($invoice->customer_phone)
        <div class="r-customer-phone">Contact No: {{ $invoice->customer_phone }}</div>
        @endif
    </div>

    {{-- Handled By --}}
    @if($invoice->employee)
    <div class="r-handled-by">
        <div class="r-handled-by-label">★ Handled By</div>
        <div class="r-handled-by-name">{{ $invoice->employee->name }}</div>
    </div>
    @endif

    {{-- Items --}}
    <table class="r-table">
        <thead>
            <tr>
                <th style="width:16px">#</th>
                <th>Description</th>
                <th style="width:45px; text-align:left; padding-left:5px;">Size</th>
                <th class="r" style="width:20px">Qty</th>
                @if($invoice->discount_amount > 0)
                <th class="r" style="width:28px">Disc</th>
                @endif
                <th class="r" style="width:52px">Total</th>
            </tr>
        </thead>
        <tbody>
            @php $i = 1; @endphp
            @foreach($invoice->items as $item)
            <tr>
                <td>{{ $i++ }}</td>
                <td>
                    {{ $item->description }}
                    @if($item->product_sku)
                    <div class="r-item-sku">{{ $item->product_sku }}</div>
                    @endif
                    <div style="font-size:9px;color:#888">@ {{ number_format($item->unit_price, 2) }}</div>
                </td>
                <td style="text-align:left; padding-left:5px; font-size:10px;">{{ $item->variant?->size ?? '-' }}</td>
                <td class="r">{{ $item->quantity }}</td>
                @if($invoice->discount_amount > 0)
                <td class="r">{{ $item->discount_pct > 0 ? $item->discount_pct.'%' : '-' }}</td>
                @endif
                <td class="r" style="font-weight:700">{{ number_format($item->line_total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Totals --}}
    <div class="r-totals">
        <div class="r-totals-row">
            <span class="r-totals-label">Sub Total</span>
            <span class="r-totals-value">{{ number_format($invoice->subtotal, 2) }}</span>
        </div>
        @if($invoice->discount_amount > 0)
        <div class="r-totals-row">
            <span class="r-totals-label">Discount</span>
            <span class="r-totals-value">- {{ number_format($invoice->discount_amount, 2) }}</span>
        </div>
        @endif
        @if($invoice->tax_amount > 0)
        <div class="r-totals-row">
            <span class="r-totals-label">Tax {{ $invoice->tax_rate }}%</span>
            <span class="r-totals-value">{{ number_format($invoice->tax_amount, 2) }}</span>
        </div>
        @else
        <div class="r-totals-row">
            <span class="r-totals-label">Tax</span>
            <span class="r-totals-value">00.00 %</span>
        </div>
        @endif
        <div class="r-totals-divider"></div>
    </div>
    <div class="r-grand">
        <span>TOTAL</span>
        <span>{{ number_format($invoice->total_amount, 2) }}</span>
    </div>

    {{-- Terms --}}
    @if(!empty($termsConditions))
    <div class="r-section">
        <div class="r-section-title">Terms &amp; Conditions</div>
        <div class="r-section-body">{{ $termsConditions }}</div>
    </div>
    @endif

    {{-- Payment Info --}}
    @if(!empty($paymentInfo))
    <div class="r-section">
        <div class="r-section-title">Payment Info</div>
        <div class="r-section-body">{{ $paymentInfo }}</div>
    </div>
    @endif

    {{-- Notes --}}
    @if($invoice->notes && empty($termsConditions) && empty($paymentInfo))
    <div class="r-section">
        <div class="r-section-title">Notes</div>
        <div class="r-section-body">{{ $invoice->notes }}</div>
    </div>
    @endif

    {{-- Footer --}}
    <div class="r-footer">
        <div class="r-thankyou">{{ $invoiceNote }}</div>
        <div class="r-sign-line"></div>
        <div class="r-sign-label">Authorised Sign</div>
        <div class="r-shop-footer">{{ $shopName }} · {{ $invoice->created_at->format('d/m/Y H:i') }}</div>
    </div>

</div>

@else
{{-- ═══════════════════════════════════════════════════════
     A4 PROFESSIONAL INVOICE LAYOUT
═══════════════════════════════════════════════════════ --}}
<div class="page">

    {{-- Top yellow bar --}}
    <div class="top-bar"></div>

    {{-- Header --}}
    <div class="a4-header">
        <div class="logo-wrap">
    @if(!empty($resolvedShopLogoUrl))
        <img src="{{ $resolvedShopLogoUrl }}" alt="Logo">
    @else
        <div class="logo-text">{{ $shopName }}</div>
    @endif
</div>
        <div class="invoice-title">INVOICE</div>
    </div>

    {{-- Yellow rule --}}
    <div class="yellow-rule"></div>

    {{-- Bill To + Meta --}}
    <div class="a4-meta">
        <div>
            <div class="bill-to-label">Invoice to:</div>
            <div class="bill-to-name">{{ $invoice->customer_name }}</div>
            @if($invoice->customer_phone)
                <div class="bill-to-phone">Contact No: {{ $invoice->customer_phone }}</div>
            @endif
        </div>
        <table class="meta-tbl">
            <tr>
                <td class="ml">Invoice</td>
                <td class="mv">{{ $invoice->invoice_number }}</td>
            </tr>
            <tr>
                <td class="ml">Date</td>
                <td class="mv">{{ $invoice->created_at->format('d / m / Y') }}</td>
            </tr>
            @if($invoice->due_date)
                <tr>
                    <td class="ml">Due Date</td>
                    <td class="mv">{{ $invoice->due_date->format('d / m / Y') }}</td>
                </tr>
            @endif
            <tr>
                <td class="ml">Status</td>
                <td class="mv">{{ ucfirst(str_replace('_', ' ', $invoice->status)) }}</td>
            </tr>
        </table>
    </div>

    {{-- Handled By --}}
    @if($invoice->employee)
        <div class="handled-by-row">
            <div class="handled-by-badge">
                <span>★</span>
                <div>
                    <div class="hb-label">Handled By</div>
                    <div class="hb-name">{{ $invoice->employee->name }}</div>
                </div>
            </div>
        </div>
    @endif

    {{-- Items Table --}}
    <div class="items-wrap">
        <table class="items">
            <thead>
                <tr>
                    <th style="width:36px">SL.</th>
                    <th>Item Description</th>
                    <th class="c" style="width:70px">Size</th>
                    <th class="r" style="width:90px">Price</th>
                    <th class="c" style="width:60px">Qty.</th>
                    @if($invoice->discount_amount > 0)
                        <th class="r" style="width:80px">Discount</th>
                    @endif
                    <th class="r" style="width:90px">Total</th>
                </tr>
            </thead>
            <tbody>
                @php $idx = 1; @endphp
                @foreach($invoice->items as $item)
                    <tr>
                        <td style="font-weight:700;color:#555">{{ $idx++ }}</td>
                        <td>
                            {{ $item->description }}
                            @if($item->product_sku)
                                <span style="color:#aaa;font-size:10px;margin-left:6px">{{ $item->product_sku }}</span>
                            @endif
                        </td>
                        <td class="c">{{ $item->variant?->size ?? '-' }}</td>
                        <td class="r">{{ number_format($item->unit_price, 2) }}</td>
                        <td class="c">{{ str_pad($item->quantity, 2, '0', STR_PAD_LEFT) }}</td>
                        @if($invoice->discount_amount > 0)
                            <td class="r">
                                @if($item->discount_pct > 0)
                                    {{ $item->discount_pct }}%
                                @else
                                    —
                                @endif
                            </td>
                        @endif
                        <td class="r" style="font-weight:700">{{ number_format($item->line_total, 2) }}</td>
                    </tr>
                @endforeach

                {{-- Filler rows (min 6 total) --}}
                @php $fillerCount = max(0, 6 - count($invoice->items)); @endphp
                @for($i = 0; $i < $fillerCount; $i++)
                    <tr>
                        <td>&nbsp;</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        @if($invoice->discount_amount > 0)
                            <td></td>
                        @endif
                        <td></td>
                    </tr>
                @endfor
            </tbody>
        </table>
    </div>

    {{-- Thank you note --}}
    <div class="thankyou">{{ $invoiceNote }}</div>

    {{-- Bottom: Left (terms/payment) + Right (totals) --}}
    <div class="a4-bottom">
        <div class="a4-left">
            @if(!empty($termsConditions))
                <div class="a4-block">
                    <h4>Terms &amp; Conditions</h4>
                    <p>{{ $termsConditions }}</p>
                </div>
            @endif
            @if(!empty($paymentInfo))
                <div class="a4-block">
                    <h4>Payment Info:</h4>
                    <p>{{ $paymentInfo }}</p>
                </div>
            @endif
            @if($invoice->notes && empty($termsConditions) && empty($paymentInfo))
                <div class="a4-block">
                    <h4>Notes</h4>
                    <p>{{ $invoice->notes }}</p>
                </div>
            @endif
        </div>

        <div class="a4-right">
            <div class="t-row">
                <span class="tl">Sub Total:</span>
                <span class="tv">{{ number_format($invoice->subtotal, 2) }}</span>
            </div>
            @if($invoice->discount_amount > 0)
                <div class="t-row">
                    <span class="tl">Discount:</span>
                    <span class="tv">{{ number_format($invoice->discount_amount, 2) }}</span>
                </div>
            @endif
            @if($invoice->tax_amount > 0)
                <div class="t-row">
                    <span class="tl">Tax ({{ $invoice->tax_rate }}%):</span>
                    <span class="tv">{{ number_format($invoice->tax_amount, 2) }}</span>
                </div>
            @else
                <div class="t-row">
                    <span class="tl">Tax:</span>
                    <span class="tv">00.00 %</span>
                </div>
            @endif
            <div class="t-grand">
                <span class="gl">Total:</span>
                <span class="gv">{{ number_format($invoice->total_amount, 2) }}</span>
            </div>
        </div>
    </div>

    {{-- Authorised Sign --}}
    <div class="sign-section">
        <div class="sign-line"></div>
        <div class="sign-label">Authorised Sign</div>
    </div>

    {{-- Footer --}}
    <div class="a4-footer" style="margin-top:24px">
        <div class="footer-bar"></div>
        <div class="footer-txt">
            @php
                $parts = [$shopName];
                if (!empty($shopPhone))   $parts[] = $shopPhone;
                if (!empty($shopAddress)) $parts[] = $shopAddress;
            @endphp
            <span>{{ implode(' · ', $parts) }}</span>
            @if(!empty($shopEmail))
                <span>{{ $shopEmail }}</span>
            @endif
        </div>
    </div>

</div>
@endif

</div>{{-- /page-wrap --}}
</body>
</html>