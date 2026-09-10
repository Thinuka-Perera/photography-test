<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreditPayment extends Model
{
    protected $fillable = [
        'credit_bill_id',
        'amount',
        'payment_method',
        'reference_number',
        'bank_name',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function bill()
    {
        return $this->belongsTo(CreditBill::class, 'credit_bill_id');
    }

    public function createdByEmployee()
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }
}