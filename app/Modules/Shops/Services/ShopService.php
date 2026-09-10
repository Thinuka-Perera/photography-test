<?php

namespace App\Modules\Shops\Services;

use App\Models\Role;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * ShopService
 *
 * Data-layer access object for shops. Encapsulates every query the rest
 * of the application needs to perform on the `shops` table so the calling
 * code (controllers, middleware, Inertia share callbacks) does not have
 * to construct Eloquent queries directly. Pure data, no request awareness.
 *
 * Single responsibility: expose a small typed API for shop look-ups
 * and shop ownership/defaulting.
 *
 * Threading model: stateless. Safe to register as a singleton.
 */
class ShopService
{
    /**
     * Return every shop the given user is allowed to interact with.
     *
     * Super admins and configured admin roles see all active shops; everyone
     * else only sees shops linked on the `shop_user` pivot.
     *
     * @param  User|null  $user  The authenticated user, or null.
     * @return Collection<int, Shop>
     */
    public function listAvailable(?User $user): Collection
    {
        if (! $user) {
            return new Collection;
        }

        if ($user->hasAnyRole(Role::adminRoleSlugs())) {
            return Shop::query()
                ->active()
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get();
        }

        return $user->shops()
            ->where('shops.is_active', true)
            ->orderByDesc('shops.is_default')
            ->orderBy('shops.name')
            ->get();
    }

    /**
     * Find a shop by its URL-friendly slug.
     */
    public function findBySlug(string $slug): ?Shop
    {
        return Shop::query()
            ->where('slug', $slug)
            ->first();
    }

    /**
     * Find a shop by its primary id.
     */
    public function findById(int $id): ?Shop
    {
        return Shop::query()->find($id);
    }

    /**
     * Return the system-default shop, falling back to the first active
     * shop if no shop is flagged as default. Returns null only if the
     * `shops` table is empty (which should not happen in production).
     */
    public function getDefault(): ?Shop
    {
        return Shop::query()->default()->first()
            ?? Shop::query()->active()->orderBy('id')->first();
    }

    /**
     * Promote a shop to be the unique system default. Wraps the change in
     * a single transaction so we never end up with two default shops.
     *
     * @param  Shop  $shop  The shop to mark as default.
     * @return Shop The refreshed model.
     */
    public function markDefault(Shop $shop): Shop
    {
        DB::transaction(function () use ($shop) {
            Shop::query()->where('is_default', true)->update(['is_default' => false]);
            $shop->forceFill(['is_default' => true])->save();
        });

        return $shop->fresh();
    }
}
