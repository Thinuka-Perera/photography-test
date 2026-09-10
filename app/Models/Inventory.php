<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Inventory Model
 *
 * Stores the CURRENT STOCK SNAPSHOT for a single product variant.
 * This is a one-to-one companion to ProductVariant.
 *
 * IMPORTANT: The `current_stock` value is NEVER directly edited from the UI.
 * It is ONLY updated by the StockService when a StockLog entry is recorded:
 *   - StockLog type=IN  → current_stock += quantity
 *   - StockLog type=OUT → current_stock -= quantity
 *
 * The `low_stock_threshold` value is used by the UI to show a red "Low Stock" badge
 * whenever current_stock < low_stock_threshold.
 *
 * @property int $id
 * @property int $variant_id
 * @property int $current_stock        Live running balance (managed by StockService only)
 * @property int $low_stock_threshold  Alert level for the UI — default 10 units
 */
class Inventory extends Model
{
    use BelongsToShop;

    /**
     * Explicitly set the table name to 'inventory'.
     * Without this, Laravel would default to 'inventories' (plural convention).
     */
    protected $table = 'inventory';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'shop_id',
        'variant_id',
        'current_stock',
        'low_stock_threshold',
    ];

    protected function casts(): array
    {
        return [
            'current_stock' => 'decimal:2',
            'low_stock_threshold' => 'decimal:2',
        ];
    }

    // ─────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────

    /**
     * An inventory record belongs to one product variant.
     * This is the one-to-one inverse of ProductVariant::inventory().
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
