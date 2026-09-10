<?php

namespace App\Modules\Shops\Http\Middleware;

use App\Modules\Shops\Models\Shop;
use App\Modules\Shops\Services\ActiveShopResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SetActiveShop Middleware
 *
 * Runs after `auth` on every authenticated web request. Resolves the
 * "active shop" for the user via the ActiveShopResolver, persists the
 * decision into the session and onto the user's `last_shop_id`, and
 * binds the resolved Shop into the service container so any controller
 * or service can simply type-hint Shop in their constructor and receive
 * the right instance for the request.
 *
 * Side effects (intentional, in this order):
 *   1. Hydrate the request-scoped resolver cache.
 *   2. If a shop is resolved, write `active_shop_id` to the session.
 *   3. If the resolved shop differs from the user's stored preference,
 *      persist the new preference (lazy, no extra query when unchanged).
 *   4. Bind the Shop singleton into the container for this request.
 */
class SetActiveShop
{
    /**
     * @param  ActiveShopResolver $resolver
     */
    public function __construct(private readonly ActiveShopResolver $resolver) {}

    /**
     * Handle an incoming request.
     *
     * @param  Request                $request
     * @param  Closure(Request): mixed $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $shop = $this->resolver->resolve($request, $user);

        if ($shop && $request->hasSession()) {
            $request->session()->put(ActiveShopResolver::SESSION_KEY, $shop->id);
        }

        if ($shop && $user && (int) ($user->last_shop_id ?? 0) !== $shop->id) {
            $user->forceFill(['last_shop_id' => $shop->id])->saveQuietly();
        }

        if ($shop) {
            // Container binding so any class can inject Shop directly
            app()->instance(Shop::class, $shop);
        }

        return $next($request);
    }
}
