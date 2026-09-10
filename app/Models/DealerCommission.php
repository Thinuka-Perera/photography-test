<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class DealerCommission extends Model
{
    use BelongsToShop;
    
    protected $table = 'dealer_commissions';

    protected $fillable = [
        'shop_id',
        'bill_id',
        'dealer_id',
        'commission_date',
        'total_bill_amt',
        'commissionable_amount',
        'commission_pct',
        'commission_amt',
        'is_paid',
        'paid_at',
        'ledger_entry_id',
    ];

    protected $casts = [
        'total_bill_amt' => 'decimal:2',
        'commissionable_amount' => 'decimal:2',
        'commission_pct' => 'decimal:2',
        'commission_amt' => 'decimal:2',
        'is_paid' => 'boolean',
        'paid_at' => 'datetime',
        'commission_date' => 'date',
    ];

    // ── Relationships ──────────────────────────────────────────────

    public function bill()
    {
        return $this->belongsTo(Bill::class);
    }

    public function dealer()
    {
        return $this->belongsTo(Employee::class, 'dealer_id');
    }

    public function salaryLedgerEntry()
    {
        return $this->belongsTo(SalaryLedgerEntry::class, 'ledger_entry_id');
    }

    // ── Scopes ────────────────────────────────────────────────────

    public function scopeUnpaid($query)
    {
        return $query->where('is_paid', false);
    }

    public function scopeByDealer($query, int $dealerId)
    {
        return $query->where('dealer_id', $dealerId);
    }

    public function scopeByDateRange($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('commission_date', [$startDate, $endDate]);
    }
}
