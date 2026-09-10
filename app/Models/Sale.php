<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use App\Models\User;

class Sale extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'sale_number',
        'customer_id',
        'customer_name',
        'customer_phone',
        'reference_number',
        'bank_name',
        'payment_method',
        'cashier_id',
        'editor_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'commission_rate',
        'commission_amount',
        'commission_mode',
        'status',
        'completed_at',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'editor_id');
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function scopeWithIndexRelations(Builder $query): Builder
    {
        return $query->with(['payments', 'items']);
    }

    public function scopeWithDetailRelations(Builder $query): Builder
    {
        return $query->with(['payments', 'items', 'refunds']);
    }

    public function getRoundedTotalAmountAttribute(): float
    {
        return round((float) $this->total_amount, 2);
    }

    public function getRemainingRefundableAttribute(): float
    {
        $refunded = (float) $this->refunds()
            ->where('status', 'completed')
            ->sum('amount');

        return max(0, round(((float) $this->total_amount) - $refunded, 2));
    }
}
