<?php

namespace App\Http\Controllers;

use App\Models\PhotographyPackage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PackageController extends Controller
{
    public function index(): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $packages = PhotographyPackage::forShop($activeShop->id)
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        $categoryCount = PhotographyPackage::forShop($activeShop->id)
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->count('category');

        $stats = [
            'total_packages' => PhotographyPackage::forShop($activeShop->id)->count(),
            'draft_packages' => PhotographyPackage::forShop($activeShop->id)->where('status', 'draft')->count(),
            'active_packages' => PhotographyPackage::forShop($activeShop->id)->where('status', 'active')->count(),
            'package_categories' => $categoryCount,
        ];

        // Fetch products and their variants for selection in the Package Builder
        $products = \Illuminate\Support\Facades\DB::table('product_variants')
            ->join('products', 'product_variants.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('products.shop_id', $activeShop->id)
            ->select([
                'product_variants.id as id',
                'products.name as product_name',
                'product_variants.sku',
                'product_variants.selling_price as price',
                'categories.name as category_name',
            ])
            ->orderBy('products.name')
            ->orderBy('product_variants.sku')
            ->get();

        return Inertia::render('Photography/Packages/Index', [
            'packages' => $packages,
            'stats' => $stats,
            'products' => $products,
            'shopSettings' => [
                ...\App\Models\ShopSetting::all_settings(),
                'shop_logo_url' => \App\Models\ShopSetting::get('shop_logo') ? asset('storage/' . \App\Models\ShopSetting::get('shop_logo')) : null,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);

        PhotographyPackage::create([
            'shop_id' => app(\App\Modules\Shops\Models\Shop::class)->id,
            'name' => ($data['name'] ?? '') ?: 'General Package',
            'category' => ($data['category'] ?? '') ?: 'General',
            'event_type' => ($data['event_type'] ?? '') ?: 'General',
            'services' => $this->normalizeServices($data['services'] ?? []),
            'deliverables' => $this->cleanDeliverables($data['deliverables'] ?? []),
            'total_price' => round((float) $data['total_price'], 2),
            'notes' => $data['notes'] ?? null,
            'status' => $data['status'],
            'products' => $data['products'] ?? [],
        ]);

        return back()->with('success', 'Package saved successfully.');
    }

    public function update(Request $request, PhotographyPackage $package): RedirectResponse
    {
        $data = $this->validatePayload($request);

        $package->update([
            'name' => ($data['name'] ?? '') ?: 'General Package',
            'category' => ($data['category'] ?? '') ?: 'General',
            'event_type' => ($data['event_type'] ?? '') ?: 'General',
            'services' => $this->normalizeServices($data['services'] ?? []),
            'deliverables' => $this->cleanDeliverables($data['deliverables'] ?? []),
            'total_price' => round((float) $data['total_price'], 2),
            'notes' => $data['notes'] ?? null,
            'status' => $data['status'],
            'products' => $data['products'] ?? [],
        ]);

        return back()->with('success', 'Package updated successfully.');
    }

    public function destroy(PhotographyPackage $package): RedirectResponse
    {
        $package->delete();

        return back()->with('success', 'Package deleted successfully.');
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'event_type' => ['nullable', 'string', 'max:100'],
            'total_price' => ['required', 'numeric', 'min:0'],
            'services' => ['nullable', 'array'],
            'services.*.name' => ['nullable', 'string', 'max:255'],
            'deliverables' => ['nullable', 'array'],
            'deliverables.*' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['draft', 'active', 'archived'])],
            'products' => ['nullable', 'array'],
            'products.*.variant_id' => ['nullable', 'integer'],
            'products.*.custom_name' => ['nullable', 'string', 'max:255'],
            'products.*.quantity' => ['required', 'integer', 'min:1'],
            'products.*.price' => ['nullable', 'numeric', 'min:0'],
            'products.*.is_optional' => ['required', 'boolean'],
        ]);
    }

    private function normalizeServices(array $services): array
    {
        return array_values(array_filter(array_map(static function ($service) {
            $name = trim((string) ($service['name'] ?? ''));

            return $name === '' ? null : ['name' => $name];
        }, $services)));
    }
    private function cleanDeliverables(array $deliverables): array
    {
        return array_values(
            array_filter(
                array_map(static fn ($value) => trim((string) $value), $deliverables),
                static fn ($value) => $value !== ''
            )
        );
    }
}
