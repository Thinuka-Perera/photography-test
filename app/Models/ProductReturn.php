<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductReturn extends Model
{
    use BelongsToShop;

    protected $table = 'product_returns';

    protected $fillable = [
        'shop_id',
        'return_number',
        'sale_id',
        'invoice_id',
        'customer_id',
        'customer_name',
        'customer_phone',
        'total_amount',
        'reason',
        'processed_by',
        'status',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
    ];

    // ── Relationships ──────────────────────────────────────────────

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Bill::class, 'sale_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProductReturnItem::class, 'product_return_id');
    }
}
