<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReturnItem extends Model
{
    protected $table = 'product_return_items';

    protected $fillable = [
        'product_return_id',
        'product_id', // Variant ID representable in POS / Invoice
        'product_name',
        'product_sku',
        'quantity',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'quantity'   => 'integer',
    ];

    // ── Relationships ──────────────────────────────────────────────

    public function productReturn(): BelongsTo
    {
        return $this->belongsTo(ProductReturn::class, 'product_return_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_id');
    }
}
