<?php

namespace App\Services;

use App\Models\CreditBill;
use App\Models\CreditPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreditBillService
{
    public function recordPayment(CreditBill $bill, array $data): CreditBill
    {
        return DB::transaction(function () use ($bill, $data) {
            $bill->refresh();

            if ($bill->status === 'settled') {
                throw ValidationException::withMessages([
                    'bill' => 'This bill is already settled.',
                ]);
            }

            $amount = round((float) ($data['amount'] ?? 0), 2);
            $currentBalance = round((float) $bill->balance_amount, 2);

            if (round($amount - $currentBalance, 2) > 0) {
                throw ValidationException::withMessages([
                    'amount' => 'Payment amount cannot exceed the current balance.',
                ]);
            }

            CreditPayment::query()->create([
                'credit_bill_id' => $bill->id,
                'amount' => $amount,
                'payment_method' => $data['payment_method'],
                'reference_number' => $data['reference_number'] ?? null,
                'bank_name' => $data['bank_name'] ?? null,
                'created_by' => $data['front_officer_id'],
            ]);

            $newPaid = round((float) $bill->paid_amount + $amount, 2);
            $newBalance = round((float) $bill->total_amount - $newPaid, 2);

            $bill->paid_amount = $newPaid;
            $bill->balance_amount = $newBalance;

            if ($newBalance <= 0) {
                $bill->status = 'settled';
                $bill->settled_date = today();
                $bill->settled_by = $data['front_officer_id'];
            }

            $bill->save();

            // Synchronize parent Bill if it exists
            if ($bill->bill_id) {
                $parentBill = \App\Models\Bill::find($bill->bill_id);
                if ($parentBill) {
                    $parentUpdates = [
                        'paid_amount' => $newPaid,
                        'balance_due' => max(0, $newBalance),
                    ];
                    
                    if ($newBalance <= 0) {
                        $parentUpdates['status'] = 'delivered';
                    }
                    
                    $parentBill->update($parentUpdates);
                }
            }

            $parentSale = null;
            if ($bill->sale_id) {
                $parentSale = \App\Models\Sale::find($bill->sale_id);
            }

            $parentBill = null;
            if ($bill->bill_id) {
                $parentBill = \App\Models\Bill::find($bill->bill_id);
            }

            if (! $parentSale && $parentBill) {
                $parentSale = \App\Models\Sale::where('sale_number', 'SALE-'.$parentBill->bill_number)->first();
            }

            if (! $parentSale && $parentBill) {
                $parentSale = \App\Models\Sale::create([
                    'shop_id' => $parentBill->shop_id ?? app(\App\Modules\Shops\Models\Shop::class)->id,
                    'sale_number' => 'SALE-'.$parentBill->bill_number,
                    'customer_id' => $parentBill->customer_id,
                    'customer_name' => $parentBill->customer_name,
                    'customer_phone' => $parentBill->customer_phone,
                    'reference_number' => $parentBill->reference_number,
                    'bank_name' => $parentBill->bank_name,
                    'payment_method' => $parentBill->payment_method,
                    'cashier_id' => auth()->id(),
                    'editor_id' => $parentBill->editor_id,
                    'subtotal' => $parentBill->subtotal,
                    'discount_amount' => $parentBill->discount_amount,
                    'total_amount' => $parentBill->after_discount,
                    'commission_rate' => (float) ($parentBill->commission_pct ?? 0),
                    'commission_amount' => optional($parentBill->commission)->commission_amt ?? 0,
                    'status' => $newBalance <= 0 ? 'completed' : 'pending',
                    'completed_at' => $parentBill->created_at ?? now(),
                ]);

                // Copy items to sale for detailed reporting
                foreach ($parentBill->items as $item) {
                    $qty = (float) $item->quantity;
                    $price = (float) $item->unit_price;
                    $lineDisc = (float) ($item->discount_amount ?? 0);
                    $lineTotal = (float) ($item->line_total ?? ($price * $qty));

                    $discountPct = 0.00;
                    if ($qty > 0 && $price > 0) {
                        if ($item->discount_type === 'percent') {
                            $discountPct = (float) ($item->discount_value ?? 0);
                        } else {
                            $discountPct = round(($lineDisc / ($price * $qty)) * 100, 2);
                        }
                    }

                    $parentSale->items()->create([
                        'product_name' => $item->description,
                        'unit_price' => $price,
                        'quantity' => $qty,
                        'discount_pct' => $discountPct,
                        'line_discount_amount' => $lineDisc,
                        'line_total' => $lineTotal,
                    ]);
                }

                // Link Sale to CreditBill
                $bill->sale_id = $parentSale->id;
                $bill->saveQuietly();
            } else if ($parentSale) {
                if ($newBalance <= 0) {
                    $parentSale->update(['status' => 'completed']);
                }
            }

            if ($parentSale) {
                \App\Models\Payment::create([
                    'sale_id' => $parentSale->id,
                    'method' => $data['payment_method'],
                    'amount' => $amount,
                    'reference_no' => $data['reference_number'] ?? null,
                    'gateway' => $data['bank_name'] ?? null,
                    'status' => 'completed',
                    'confirmed_at' => now(),
                ]);
            }

            return $bill->fresh(['payments', 'createdByEmployee', 'settledByEmployee']);
        });
    }
}
