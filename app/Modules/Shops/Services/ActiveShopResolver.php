<?php

namespace App\Modules\Shops\Services;

use App\Models\Role;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\Request;

/**
 * ActiveShopResolver
 *
 * Determines which Shop should be considered "active" for the current
 * HTTP request. Pure logic — does not write to the session itself; the
 * SetActiveShop middleware is responsible for persistence side-effects.
 *
 * Resolution precedence (first match wins):
 *   1. `?shop=<slug>` query param on the current request
 *   2. `shop=<slug>` in the request payload (POST/PUT form data)
 *   3. `active_shop_id` stored in the session
 *   4. The user's `last_shop_id` column (their last visited shop)
 *   5. The shop flagged with `is_default = true`
 *   6. The first active shop (deterministic by id)
 *
 * The resolver caches the result on the Request object so multiple lookups
 * within a single request never hit the database twice.
 */
class ActiveShopResolver
{
    private const REQUEST_CACHE_KEY = '__active_shop_cache__';

    public const SESSION_KEY = 'active_shop_id';

    public function __construct(private readonly ShopService $shops) {}

    /**
     * Resolve the active shop for the given request and user.
     *
     * @param  Request  $request  The current HTTP request.
     * @param  User|null  $user  The authenticated user, or null.
     * @return Shop|null The resolved shop, or null if the
     *                   system has no shops at all.
     */
    public function resolve(Request $request, ?User $user): ?Shop
    {
        // Per-request memoization — avoid hitting the DB more than once
        if ($request->attributes->has(self::REQUEST_CACHE_KEY)) {
            return $request->attributes->get(self::REQUEST_CACHE_KEY);
        }

        $candidate = $this->fromQueryParam($request)
            ?? $this->fromPayload($request)
            ?? $this->fromSession($request)
            ?? $this->fromUserPreference($user)
            ?? null;

        if ($candidate === null && $user && $user->hasAnyRole(Role::adminRoleSlugs())) {
            $candidate = $this->shops->getDefault();
        }

        $shop = $this->ensureUserMayUseShop($user, $candidate);

        $request->attributes->set(self::REQUEST_CACHE_KEY, $shop);

        return $shop;
    }

    /**
     * Read the `?shop=<slug>` URL parameter, if present.
     */
    private function fromQueryParam(Request $request): ?Shop
    {
        $slug = $request->query('shop');

        if (! is_string($slug) || $slug === '') {
            return null;
        }

        return $this->shops->findBySlug($slug);
    }

    /**
     * Read `shop=<slug>` from request input for non-GET form submissions.
     */
    private function fromPayload(Request $request): ?Shop
    {
        $slug = $request->input('shop');

        if (! is_string($slug) || $slug === '') {
            return null;
        }

        return $this->shops->findBySlug($slug);
    }

    /**
     * Read `active_shop_id` from the session, if present.
     */
    private function fromSession(Request $request): ?Shop
    {
        if (! $request->hasSession()) {
            return null;
        }

        $shopId = $request->session()->get(self::SESSION_KEY);

        if (! $shopId) {
            return null;
        }

        return $this->shops->findById((int) $shopId);
    }

    /**
     * Read the user's `last_shop_id` preference, if any.
     */
    private function fromUserPreference(?User $user): ?Shop
    {
        $lastShopId = $user?->last_shop_id ?? null;

        if (! $lastShopId) {
            return null;
        }

        return $this->shops->findById((int) $lastShopId);
    }

    /**
     * Return the shop if the user may use it; otherwise the first shop they
     * are allowed to use (never an unauthorized default for scoped users).
     */
    private function ensureUserMayUseShop(?User $user, ?Shop $candidate): ?Shop
    {
        if (! $user) {
            return $candidate;
        }

        if ($candidate && $this->userMayUseShop($user, $candidate)) {
            return $candidate;
        }

        return $this->firstAuthorizedShopForUser($user);
    }

    private function userMayUseShop(User $user, Shop $shop): bool
    {
        if (! $shop->is_active) {
            return false;
        }

        if ($user->hasAnyRole(Role::adminRoleSlugs())) {
            return true;
        }

        return $user->hasAccessToShop($shop->id);
    }

    private function firstAuthorizedShopForUser(User $user): ?Shop
    {
        if ($user->hasAnyRole(Role::adminRoleSlugs())) {
            return $this->shops->getDefault();
        }

        return $user->shops()
            ->where('shops.is_active', true)
            ->orderByDesc('shops.is_default')
            ->orderBy('shops.name')
            ->first();
    }
}
