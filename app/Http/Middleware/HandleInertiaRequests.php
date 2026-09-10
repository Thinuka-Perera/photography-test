<?php

namespace App\Http\Middleware;

use App\Models\Role;
use App\Models\ShopSetting;
use App\Modules\Shops\Models\Shop;
use App\Modules\Shops\Services\ActiveShopResolver;
use App\Modules\Shops\Services\ShopService;
use App\Services\ShopReceiptProfile;
use App\Services\EmployeeBirthdayService;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->loadMissing('role');
        $pagePermissions = $user?->pagePermissions() ?? [];
        $pageKeys = collect($pagePermissions)
            ->flatMap(function (string $p) {
                if (str_starts_with($p, 'studio.credit_management')) {
                    $p = str_replace('studio.credit_management', 'credit-management', $p);
                }

                $actions = ['view', 'create', 'edit', 'delete', 'export'];
                $parts = explode('.', $p);
                $lastPart = end($parts);

                if (count($parts) > 1 && in_array($lastPart, $actions, true)) {
                    array_pop($parts);
                    $baseKey = implode('.', $parts);
                    return [$p, $baseKey];
                }

                return [$p];
            })
            ->unique()
            ->values()
            ->all();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ? [
                        'id' => $user->role->id,
                        'name' => $user->role->name,
                        'slug' => $user->role->slug,
                    ] : null,
                ] : null,
                'access' => $user ? [
                    'role_name' => $user->role?->name,
                    'role_slug' => $user->role?->slug,
                    'page_keys' => $pageKeys,
                    'page_lookup' => array_fill_keys($pagePermissions, true),
                    'is_admin' => $user->hasAnyRole(Role::adminRoleSlugs()),
                    'is_super_admin' => $user->isSuperAdmin(),
                ] : null,
            ],
            // Share Ziggy route definitions with React frontend
            // This enables the use of route('name') in all React components
            'ziggy' => fn () => [...(new Ziggy)->toArray(), 'location' => $request->url()],

            // Share Laravel session flash messages with every Inertia response.
            // These are set by controllers via: return back()->with('success', 'Done!');
            // Available in React as: usePage().props.flash
            'flash' => [
                'success' => $request->session()->get('success'),
                'message' => $request->session()->get('message'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'receipt' => $request->session()->get('receipt'),
                'bill_id' => $request->session()->get('bill_id'),
                'bill_number' => $request->session()->get('bill_number'),
                'saved_bill' => $request->session()->get('saved_bill'),
                'completed_bill_id' => $request->session()->get('completed_bill_id'),
                'completed_print_type' => $request->session()->get('completed_print_type'),
            ],
            'shopSettings' => fn () => $this->shareShopSettings($request),
            'navigation' => [
                'pages' => config('access.pages', []),
                'admin_only_pages' => config('access.admin_only_pages', []),
            ],

            // ─────────────────────────────────────────────
            // Multi-shop layer — every page sees the available
            // shops and which shop is currently active.
            // ─────────────────────────────────────────────
            // Eager values (not deferred closures) so active shop always matches session after switch.
            'shops' => $this->shareShops($request),
            'activeShop' => $this->shareActiveShop($request),

            'birthdayReminders' => fn () => $this->shareBirthdayReminders($request),

        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    /**
     * @return array<string, mixed>
     */
    private function shareShopSettings(Request $request): array
    {
        $shop = $request->user()
            ? app(ActiveShopResolver::class)->resolve($request, $request->user())
            : null;

        if (! $shop) {
            return [];
        }

        $profile = ShopReceiptProfile::forShop($shop);

        return [
            ...ShopSetting::all_settings($shop->id),
            'shop_name' => $profile['shop_name'],
            'shop_address' => $profile['shop_address'],
            'address' => $profile['address'],
            'shop_phone' => $profile['shop_phone'],
            'shop_hotline' => $profile['shop_hotline'],
            'shop_whatsapp' => $profile['shop_whatsapp'],
            'shop_logo_url' => $profile['shop_logo_url'],
        ];
    }

    private function shareBirthdayReminders(Request $request): array
    {
        $user = $request->user();

        if (! $user || ! $user->canAccessPage('employees')) {
            return [];
        }

        $shop = app(ActiveShopResolver::class)->resolve($request, $user);

        if (! $shop) {
            return [];
        }

        return app(EmployeeBirthdayService::class)
            ->remindersForShop($shop->id)
            ->values()
            ->all();
    }

    /**
     * Build the list of shops the current user can switch into.
     *
     * @return array<int, array<string, mixed>>
     */
    private function shareShops(Request $request): array
    {
        $user = $request->user();
        if (! $user) {
            return [];
        }

        return app(ShopService::class)
            ->listAvailable($user)
            ->map(fn (Shop $shop) => [
                'id' => $shop->id,
                'slug' => $shop->slug,
                'name' => $shop->name,
                'address' => $shop->address,
                'is_default' => (bool) $shop->is_default,
            ])
            ->values()
            ->all();
    }

    /**
     * Build the active-shop summary shared with every Inertia page.
     *
     * @return array<string, mixed>|null
     */
    private function shareActiveShop(Request $request): ?array
    {
        if (! $request->user()) {
            return null;
        }

        $shop = app(ActiveShopResolver::class)->resolve($request, $request->user());

        if (! $shop) {
            return null;
        }

        return ShopReceiptProfile::forShop($shop);
    }
}
