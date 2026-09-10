<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryProfile extends Model
{
    protected $fillable = [
        'employee_id',
        'month',
        'basic_salary',
        'attendance_allowance',
        'overtime_rate',
        'notes',
        'paid_at',
    ];

    protected $casts = [
        'month' => 'date',
        'basic_salary' => 'decimal:2',
        'attendance_allowance' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(SalaryLedgerEntry::class)->orderBy('entry_date');
    }
}
