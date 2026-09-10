<?php

namespace App\Models\Concerns;

use App\Modules\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * BelongsToShop Trait
 *
 * Adds the Shop relationship and shop-scoping query helpers to any Eloquent
 * model that carries a `shop_id` column. Used by Category, Product,
 * ProductVariant, Inventory, and StockLog.
 *
 * Why a trait instead of a Laravel global scope?
 *   Global scopes fire automatically on every query, which is dangerous for
 *   flows that legitimately span shops — login, seeding, role/permission
 *   resolution, and admin dashboards. An explicit `forShop($shopId)` scope
 *   keeps shop filtering as a deliberate decision at the call site.
 *
 * @property int $shop_id
 *
 * @method static Builder|static forShop(int|null $shopId)
 */
trait BelongsToShop
{
    /**
     * Inverse relation back to the owning Shop.
     *
     * @return BelongsTo
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Constrain a query to rows belonging to the given shop id.
     *
     * Passing null is treated as a no-op so calling code can write:
     *   Model::forShop($activeShop?->id)
     * without breaking when no shop is active (e.g. background jobs).
     *
     * @param  Builder  $query   The base query builder.
     * @param  int|null $shopId  The shop id to scope by, or null to skip.
     * @return Builder
     */
    public function scopeForShop(Builder $query, ?int $shopId): Builder
    {
        if ($shopId === null) {
            return $query;
        }

        return $query->where("{$this->getTable()}.shop_id", $shopId);
    }
}
