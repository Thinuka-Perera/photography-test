<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

/**
 * Refund model — updated by Thinuka.
 *
 * Changes from original:
 *  1. Added invoice() relationship (links refund to Thinuka's invoices table)
 *  2. Added processedBy() relationship
 *  3. Added status constants for clarity
 *  4. Added shop_id and BelongsToShop trait
 */
class Refund extends Model
{
    use BelongsToShop;

    // Status constants — prevents magic strings in controllers/services
    const STATUS_PENDING   = 'pending';
    const STATUS_COMPLETED = 'completed';

    const TYPE_FULL    = 'full';
    const TYPE_PARTIAL = 'partial';

    protected $fillable = [
        'shop_id',
        'sale_id',
        'invoice_id',    // Thinuka's invoices table (nullable — POS refunds don't need it)
        'amount',
        'type',
        'reason',
        'processed_by',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    // ── Relationships ─────────────────────────────────────────────────────

    /**
     * The POS sale this refund is against (Piyara's module).
     */
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    /**
     * The invoice this refund is against (Thinuka's module).
     * Null for POS-originated refunds that have no formal invoice.
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * The staff member who processed this refund.
     */
    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}