<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * StockLog Model
 *
 * Represents a single stock movement event (IN or OUT) for a product variant.
 * This table is the immutable audit trail — entries are NEVER deleted or edited
 * once created. This ensures a full traceable history of all stock movements.
 *
 * Every time stock changes (purchase, sale, damage, adjustment), a new row is added here.
 * The Inventory.current_stock is then updated by StockService to reflect the change.
 *
 * Balance Formula (derived from stock_logs):
 *   Balance = SUM(quantity WHERE type='IN') − SUM(quantity WHERE type='OUT')
 *
 * Common reason values:
 *   IN  → "Purchase", "Opening Balance", "Return", "Adjustment"
 *   OUT → "Sale", "Damage", "Session Usage", "Waste", "Adjustment"
 *
 * @property int    $id
 * @property int    $variant_id    The product variant this movement is for
 * @property int    $user_id       The staff member who recorded the entry
 * @property int    $quantity      Always positive — direction is set by 'type'
 * @property string $type          'IN' = stock added | 'OUT' = stock removed
 * @property string $reason        Human-readable label for why this happened
 * @property string $date          Business/actual date of the movement (supports backdating)
 */
class StockLog extends Model
{
    use BelongsToShop;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'shop_id',
        'variant_id',
        'user_id',
        'quantity',
        'type',
        'purchase_cost',
        'shipping_cost',
        'other_cost',
        'reason',
        'notes',
        'date',
    ];

    /**
     * Cast the 'date' field to a Carbon date instance for easy formatting.
     * e.g. $log->date->format('Y-m-d') or $log->date->diffForHumans()
     */
    protected $casts = [
        'date' => 'date',
        'quantity' => 'decimal:2',
        'purchase_cost' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'other_cost'    => 'decimal:2',
    ];

    // ─────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────

    /**
     * A stock log entry belongs to one product variant.
     * All logs for a variant together form the full IN/OUT history.
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /**
     * A stock log entry belongs to the user who recorded it.
     * Used to track which staff member made each stock entry.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
