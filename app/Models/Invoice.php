<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Invoice extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'invoice_number',
        'sale_id',
        'quotation_id',
        'customer_id',
        'customer_name',
        'customer_phone',
        'employee_id',       // CORE: Who handled the customer's work
        'module',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'tax_rate',
        'total_amount',
        'status',
        'notes',
        'due_date',
        'created_by',
        'advance_payments',
    ];

    protected $casts = [
        'subtotal'        => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount'      => 'decimal:2',
        'tax_rate'        => 'decimal:2',
        'total_amount'    => 'decimal:2',
        'due_date'        => 'date',
        'advance_payments' => 'array',
    ];

    // ── Relationships ─────────────────────────────────────────────────────

    /**
     * Line items on this invoice.
     */
    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * The employee who handled the customer's work.
     * CORE REQUIREMENT: "Handled By: [Employee Name]" on every invoice.
     */
    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    /**
     * The user who created this invoice (audit trail).
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The POS sale this invoice was generated from (Piyara's module).
     */
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    /**
     * The quotation this invoice was converted from (Sahan's module).
     */
    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Refunds linked directly to this invoice.
     */
    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────

    public function scopeWithListRelations(Builder $query): Builder
    {
        return $query->with(['items', 'employee:id,name', 'createdBy:id,name']);
    }

    public function scopeWithDetailRelations(Builder $query): Builder
    {
        return $query->with(['items', 'employee:id,name', 'createdBy:id,name', 'refunds']);
    }

    public function scopeForModule(Builder $query, string $module): Builder
    {
        return $query->where('module', $module);
    }

    // ── Computed attributes ───────────────────────────────────────────────

    /**
     * Total amount already refunded on this invoice.
     */
    public function getTotalRefundedAttribute(): float
    {
        return round(
            (float) $this->refunds()
                ->where('status', 'completed')
                ->sum('amount'),
            2
        );
    }

    /**
     * Remaining refundable balance.
     */
    public function getRemainingRefundableAttribute(): float
    {
        return max(0, round((float) $this->total_amount - $this->total_refunded, 2));
    }

    /**
     * Status badge color mapping (used by frontend).
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'draft'            => 'gray',
            'sent'             => 'blue',
            'awaiting_payment' => 'amber',
            'paid'             => 'green',
            'partially_paid'   => 'teal',
            'refunded'         => 'red',
            'cancelled'        => 'slate',
            default            => 'gray',
        };
    }
}
