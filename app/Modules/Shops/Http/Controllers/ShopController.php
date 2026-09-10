<?php

namespace App\Modules\Shops\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Modules\Shops\Models\Shop;
use App\Modules\Shops\Services\ActiveShopResolver;
use App\Modules\Shops\Services\ShopService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ShopController
 *
 * Thin HTTP entry point for shop management. Heavy lifting lives in
 * ShopService and ActiveShopResolver — this class just orchestrates
 * request → service → response.
 *
 * Routes mounted on this controller:
 *   GET    /shops                       → index()      List + manage shops
 *   POST   /shops/active/{shop:slug}    → setActive()  Switch active shop
 *   POST   /shops                       → store()      Create shop  (admin)
 *   PUT    /shops/{shop:slug}           → update()     Update shop  (admin)
 *   DELETE /shops/{shop:slug}           → destroy()    Delete shop  (admin)
 */
class ShopController extends Controller
{
    public function __construct(private readonly ShopService $shops) {}

    /**
     * Render the shops landing/management page.
     */
    public function index(): Response
    {
        return Inertia::render('Shops/Index', [
            'shops' => $this->shops->listAvailable(request()->user())
                ->map(fn (Shop $shop) => [
                    'id' => $shop->id,
                    'slug' => $shop->slug,
                    'name' => $shop->name,
                    'bill_prefix' => $shop->bill_prefix,
                    'address' => $shop->address,
                    'phone' => $shop->phone,
                    'is_default' => (bool) $shop->is_default,
                    'is_active' => (bool) $shop->is_active,
                ])
                ->values(),
        ]);
    }

    /**
     * Switch the active shop for the current session and redirect back
     * to the page the user came from (or `/inventory` as a safe default).
     *
     * The route key is `slug`, so the model is resolved from
     * `/shops/active/main` style URLs automatically.
     */
    public function setActive(Request $request, Shop $shop): RedirectResponse
    {
        if (! $shop->is_active) {
            return back()->withErrors([
                'shop' => "Shop \"{$shop->name}\" is archived and cannot be activated.",
            ]);
        }

        $user = $request->user();
        if ($user && ! $user->hasAnyRole(Role::adminRoleSlugs()) && ! $user->hasAccessToShop($shop->id)) {
            return back()->withErrors([
                'shop' => "You do not have access to \"{$shop->name}\". Ask a super admin to add this shop under your user profile (Authorized shops).",
            ]);
        }

        $request->session()->put(ActiveShopResolver::SESSION_KEY, $shop->id);

        if ($user = $request->user()) {
            $user->forceFill(['last_shop_id' => $shop->id])->saveQuietly();
        }

        $redirectTo = $request->input('redirect_to') ?: route('inventory.index');

        return redirect($redirectTo)
            ->with('success', "Switched to {$shop->name}.");
    }

    /**
     * Create a new shop.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'slug' => 'required|string|max:64|alpha_dash|unique:shops,slug',
            'name' => 'required|string|max:120',
            'bill_prefix' => 'nullable|string|max:20|alpha_dash',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:64',
            'is_active' => 'sometimes|boolean',
        ]);

        Shop::create([
            'slug' => strtolower($data['slug']),
            'name' => $data['name'],
            'bill_prefix' => $data['bill_prefix'] ?? 'BILL',
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'is_default' => false,
        ]);

        return back()->with('success', 'Shop created successfully.');
    }

    /**
     * Update an existing shop.
     */
    public function update(Request $request, Shop $shop): RedirectResponse
    {
        $data = $request->validate([
            'slug' => "required|string|max:64|alpha_dash|unique:shops,slug,{$shop->id}",
            'name' => 'required|string|max:120',
            'bill_prefix' => 'nullable|string|max:20|alpha_dash',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:64',
            'is_active' => 'sometimes|boolean',
            'is_default' => 'sometimes|boolean',
        ]);

        $shop->fill([
            'slug' => strtolower($data['slug']),
            'name' => $data['name'],
            'bill_prefix' => $data['bill_prefix'] ?? 'BILL',
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'is_active' => $data['is_active'] ?? $shop->is_active,
        ])->save();

        if (! empty($data['is_default'])) {
            $this->shops->markDefault($shop);
        }

        return back()->with('success', 'Shop updated successfully.');
    }

    /**
     * Delete a shop. Refuses to delete the last remaining (or default) shop
     * to prevent the system being left without an active scope.
     */
    public function destroy(Shop $shop): RedirectResponse
    {
        if ($shop->is_default) {
            return back()->withErrors([
                'delete' => "Cannot delete \"{$shop->name}\" — it is the default shop. Promote another shop to default first.",
            ]);
        }

        if (Shop::query()->active()->count() <= 1) {
            return back()->withErrors([
                'delete' => 'At least one active shop must remain in the system.',
            ]);
        }

        $shop->delete();

        return back()->with('success', 'Shop deleted successfully.');
    }
}
