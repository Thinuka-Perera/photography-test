<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class Bill extends Model
{
    protected $table = 'bills';

    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'bill_number',
        'status',
        'created_by',
        'editor_id',
        'dealer_id',
        'commission_pct',
        'dealer_commission_pct',
        'is_commission_applicable',
        'is_dealer_commission_applicable',
        'payment_method',
        'customer_id',
        'customer_name',
        'customer_phone',
        'reference_number',
        'bank_name',
        'card_ref',
        'creation_charge',
        'subtotal',
        'discount_amount',
        'after_discount',
        'paid_amount',
        'advance_paid',
        'balance_due',
        'notes',
        'advance_ref_bill_id',
        'front_officer_id',
        'advance_payment_method',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'after_discount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'advance_paid' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'commission_pct' => 'decimal:2',
        'dealer_commission_pct' => 'decimal:2',
        'is_commission_applicable' => 'boolean',
        'is_dealer_commission_applicable' => 'boolean',
        'creation_charge' => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────────

    public function createdBy()
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(Employee::class, 'editor_id');
    }

    public function items()
    {
        return $this->hasMany(BillItem::class);
    }

    public function commission()
    {
        return $this->hasOne(EditorCommission::class);
    }

    public function dealerCommission()
    {
        return $this->hasOne(DealerCommission::class);
    }

    public function dealerCommissions()
    {
        return $this->hasMany(DealerCommission::class);
    }

    public function advanceRefBill()
    {
        return $this->belongsTo(Bill::class, 'advance_ref_bill_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function frontOfficer()
    {
        return $this->belongsTo(Employee::class, 'front_officer_id');
    }

    public function dealer()
    {
        return $this->belongsTo(Employee::class, 'dealer_id');
    }

    public function balanceBills()
    {
        return $this->hasMany(Bill::class, 'advance_ref_bill_id');
    }

    public function creditBill()
    {
        return $this->hasOne(CreditBill::class, 'bill_id');
    }

    public function getEffectiveStatusAttribute(): string
    {
        if (in_array($this->status, ['cancelled', 'refunded', 'partially_refunded', 'reclaimed'], true)) {
            return $this->status;
        }

        if (in_array($this->payment_method, ['credit', 'advance'], true)) {
            $credit = $this->relationLoaded('creditBill') ? $this->creditBill : $this->creditBill()->first();
            if ($credit) {
                if ($credit->status === 'settled' || (float) $credit->balance_amount <= 0) {
                    return 'settled';
                }
                if ($credit->isOverdue()) {
                    return 'overdue';
                }
                return 'outstanding';
            }

            if ((float) $this->balance_due <= 0) {
                return 'settled';
            }

            return 'outstanding';
        }

        return $this->status;
    }

    // ── Scopes ────────────────────────────────────────────────────

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByEditor($query, int $editorId)
    {
        return $query->where('editor_id', $editorId);
    }

    public function scopeByDealer($query, int $dealerId)
    {
        return $query->where('dealer_id', $dealerId);
    }

    public function scopeByDateRange($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}
