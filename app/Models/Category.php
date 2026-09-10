<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Category Model
 *
 * Represents a top-level grouping for products.
 * The 'type' field drives which UI view is shown on the Inventory page:
 *   - 'frame'   → Frame Grid View (Size + Grade filter)
 *   - 'general' → General Stock List View (Ink, Paper, Tape, etc.)
 *
 * Shop-scoped: every category belongs to exactly one shop.
 *
 * @property int    $id
 * @property int    $shop_id  Owning shop (foreign key to shops.id)
 * @property string $name     Display name of the category
 * @property string $type     Enum: 'frame' | 'general'
 */
class Category extends Model
{
    use BelongsToShop;

    /**
     * The attributes that are mass assignable.
     * These fields can be set via create() or fill() without triggering mass-assignment protection.
     */
    protected $fillable = [
        'shop_id',
        'name',
        'type',
    ];

    // ─────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────

    /**
     * A category has many products.
     * Example: "Photo Frames" category → [Photo Frame 4x6, Photo Frame 8x10, ...]
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
