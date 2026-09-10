<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - {{ $event->title }}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .receipt { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .head { padding: 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 16px; }
        .title { font-size: 24px; font-weight: 700; margin: 0; }
        .meta { font-size: 13px; color: #475569; margin-top: 6px; }
        .section { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 24px; }
        .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        .value { font-size: 15px; font-weight: 600; color: #0f172a; }
        .amount { font-size: 28px; font-weight: 800; color: #2563eb; }
        .actions { text-align: center; padding: 16px; }
        @media print { .actions { display: none; } body { background: #fff; padding: 0; } .receipt { border: none; border-radius: 0; } }
    </style>
</head>
<body>
@php
    $logoUrl = null;
    if (!empty($shopLogo)) {
        $logoValue = trim((string) $shopLogo);
        $logoUrl = str_starts_with($logoValue, 'http') || str_starts_with($logoValue, '/')
            ? $logoValue
            : asset('storage/' . ltrim(preg_replace('#^storage/#', '', $logoValue), '/'));
    } elseif (file_exists(public_path('Logo.png'))) {
        $logoUrl = asset('Logo.png');
    }
@endphp
<div class="receipt">
    <div class="head">
        <div>
            <h1 class="title">{{ $shopName }}</h1>
            <p class="meta">{{ $shopAddress }} {{ $shopPhone ? '· '.$shopPhone : '' }}</p>
        </div>
        <div>
            @if($logoUrl)
                <img src="{{ $logoUrl }}" alt="Logo" style="height: 60px; object-fit: contain;">
            @endif
        </div>
    </div>

    <div class="section">
        <div class="label">Payment Receipt</div>
        <div class="value">Receipt #EVP-{{ str_pad((string)$payment->id, 5, '0', STR_PAD_LEFT) }}</div>
        <div class="meta">Recorded on {{ optional($payment->created_at)->format('d M Y h:i A') }}</div>
    </div>

    <div class="section grid">
        <div><div class="label">Wedding</div><div class="value">{{ $event->title }}</div></div>
        <div><div class="label">Client</div><div class="value">{{ $event->client_name }}</div></div>
        <div><div class="label">Wedding Date</div><div class="value">{{ optional($event->event_date)->format('d M Y') }}</div></div>
        <div><div class="label">Payment Date</div><div class="value">{{ optional($payment->paid_on)->format('d M Y') }}</div></div>
        <div><div class="label">Method</div><div class="value">{{ ucfirst(str_replace('_', ' ', $payment->payment_method)) }}</div></div>
        <div><div class="label">Reference</div><div class="value">{{ $payment->reference_no ?: '-' }}</div></div>
    </div>

    <div class="section">
        <div class="label">Amount Received</div>
        <div class="amount">LKR {{ number_format((float)$payment->amount, 2) }}</div>
        <div class="meta">{{ $payment->notes ?: 'No notes added.' }}</div>
    </div>

    <div class="actions">
        <button onclick="window.print()" style="padding:10px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;">Print Receipt</button>
    </div>
</div>
</body>
</html>
