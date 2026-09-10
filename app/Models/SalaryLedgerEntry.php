<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryLedgerEntry extends Model
{
    protected $fillable = [
        'salary_profile_id',
        'sale_id',
        'entry_date',
        'type',
        'period',
        'title',
        'amount',
        'notes',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'period' => 'date',
        'amount' => 'decimal:2',
    ];

    public function salaryProfile(): BelongsTo
    {
        return $this->belongsTo(SalaryProfile::class);
    }
}
