<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'quote_number',
        'customer_name',
        'customer_phone',
        'event_type',
        'event_date',
        'wedding_date',
        'homecoming_date',
        'package_name',
        'notes',
        'status',
        'subtotal',
        'discount_amount',
        'total_amount',
        'manual_total',
    ];

    protected $casts = [
        'event_date' => 'date',
        'wedding_date' => 'date',
        'homecoming_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'manual_total' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }
}
