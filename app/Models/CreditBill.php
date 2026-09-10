<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class CreditBill extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'bill_id',        // ← was 'sale_id'
        'sale_id',        // keep for compatibility
        'type',
        'customer_name',
        'customer_phone',
        'total_amount',
        'paid_amount',
        'balance_amount',
        'created_by',
        'promise_date',
        'status',
        'settled_date',
        'settled_by',
        'advance_payment_method',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'promise_date' => 'date',
        'settled_date' => 'date',
    ];

    public function isOverdue(): bool
    {
        return $this->status === 'outstanding'
            && $this->promise_date !== null
            && $this->promise_date->lt(today());
    }

    public function payments()
    {
        return $this->hasMany(CreditPayment::class);
    }

    public function createdByEmployee()
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    public function settledByEmployee()
    {
        return $this->belongsTo(Employee::class, 'settled_by');
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function bill()
    {
        return $this->belongsTo(Bill::class);
    }
}