<?php

namespace App\Modules\Shops\Models;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Shop Model
 *
 * Top-level entity that represents a physical (or logical) outlet of the
 * photography business — for example "Main Shop" or "Floor 01". Every
 * inventory row, stock movement, product, variant, and category in the
 * system belongs to exactly one shop. This model is therefore the root
 * of the data-isolation boundary.
 *
 * Lifecycle:
 *   - Seeded with a default "Main Shop" by the migration that introduces
 *     this table; existing data is back-filled to that shop.
 *   - Additional shops can be created from the admin UI by users with the
 *     `shops` permission.
 *
 * Important relations:
 *   - One shop has many Categories, Products, ProductVariants,
 *     Inventory rows, and StockLog entries.
 *   - Deleting a shop cascades to all those rows (set up at the
 *     foreign-key level in the migration).
 *
 * @property int    $id
 * @property string $slug
 * @property string $name
 * @property string|null $address
 * @property string|null $phone
 * @property bool   $is_default
 * @property bool   $is_active
 *
 * @method static Builder|static active()
 * @method static Builder|static default()
 */
class Shop extends Model
{
    /** @var string */
    protected $table = 'shops';

    /**
     * Mass-assignable attributes.
     *
     * @var list<string>
     */
    protected $fillable = [
        'slug',
        'name',
        'bill_prefix',
        'address',
        'phone',
        'is_default',
        'is_active',
    ];

    /**
     * Native attribute casts.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_default' => 'boolean',
        'is_active'  => 'boolean',
    ];

    /**
     * Allow URL/route binding by `slug` instead of numeric id.
     *
     * @return string
     */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    // ─────────────────────────────────────────────
    // Query scopes
    // ─────────────────────────────────────────────

    /**
     * Constrain a query to active (non-archived) shops.
     *
     * @param  Builder $query
     * @return Builder
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Constrain a query to the system-default shop. Should always
     * return at most a single row (the migration seeds exactly one).
     *
     * @param  Builder $query
     * @return Builder
     */
    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    // ─────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────

    /**
     * Categories that belong to this shop.
     *
     * @return HasMany
     */
    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /**
     * Products that belong to this shop.
     *
     * @return HasMany
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Variants that belong to this shop.
     *
     * @return HasMany
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Inventory snapshots that belong to this shop.
     *
     * @return HasMany
     */
    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class);
    }

    /**
     * Stock movement audit log entries for this shop.
     *
     * @return HasMany
     */
    public function stockLogs(): HasMany
    {
        return $this->hasMany(StockLog::class);
    }
}
