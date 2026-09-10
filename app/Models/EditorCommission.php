<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class EditorCommission extends Model
{
    use BelongsToShop;
    
    protected $table = 'editor_commissions';

    protected $fillable = [
        'shop_id',
        'bill_id',
        'editor_id',
        'commission_date',
        'total_bill_amt',
        'commissionable_amount',
        'commission_pct',
        'commission_amt',
        'creation_charge_amt',
        'job_description',
        'is_paid',
        'paid_at',
        'ledger_entry_id',
    ];

    protected $casts = [
        'total_bill_amt' => 'decimal:2',
        'commissionable_amount' => 'decimal:2',
        'commission_pct' => 'decimal:2',
        'commission_amt' => 'decimal:2',
        'creation_charge_amt' => 'decimal:2',
        'is_paid' => 'boolean',
        'paid_at' => 'datetime',
        'commission_date' => 'date',
    ];

    // ── Relationships ──────────────────────────────────────────────

    public function bill()
    {
        return $this->belongsTo(Bill::class);
    }

    public function editor()
    {
        return $this->belongsTo(Employee::class, 'editor_id');
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

    public function scopeByEditor($query, int $editorId)
    {
        return $query->where('editor_id', $editorId);
    }

    public function scopeByDateRange($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('commission_date', [$startDate, $endDate]);
    }
}
