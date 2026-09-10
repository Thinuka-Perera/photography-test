<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BillCategory;
use App\Models\BillItem;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class BillCategoryController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        $hasShopColumn = Schema::hasColumn('bill_categories', 'shop_id');

        $nameRule = Rule::unique('bill_categories', 'name');
        if ($hasShopColumn && $activeShop?->exists) {
            $nameRule->where('shop_id', $activeShop->id);
        }

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:100',
                $nameRule,
            ],
            'default_description' => ['nullable', 'string', 'max:255'],
            'no_commission' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($hasShopColumn && ! $activeShop?->exists) {
            return back()->withInput()->with('error', 'Please select a shop before creating a POS item type.');
        }

        $attributes = [
            'name' => $data['name'],
        ];

        if ($hasShopColumn) {
            $attributes['shop_id'] = $activeShop->id;
        }

        if (Schema::hasColumn('bill_categories', 'default_description')) {
            $attributes['default_description'] = $data['default_description'] ?? '';
        }

        if (Schema::hasColumn('bill_categories', 'no_commission')) {
            $attributes['no_commission'] = $request->boolean('no_commission');
        }

        if (Schema::hasColumn('bill_categories', 'is_active')) {
            $attributes['is_active'] = $request->boolean('is_active', true);
        }

        try {
            BillCategory::create($attributes);
        } catch (\Throwable $e) {
            report($e);

            return back()
                ->withInput()
                ->with('error', 'Failed to create POS item type. Please try again after updating the server database.');
        }

        return back()->with('success', 'Bill category created successfully.');
    }

    public function update(Request $request, BillCategory $billCategory): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        $hasShopColumn = Schema::hasColumn('bill_categories', 'shop_id');

        $this->assertBillCategoryBelongsToActiveShop($billCategory, $activeShop, $hasShopColumn);

        return $this->persistUpdate($request, $billCategory, $activeShop, $hasShopColumn);
    }

    public function updatePost(Request $request): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        $hasShopColumn = Schema::hasColumn('bill_categories', 'shop_id');
        $billCategory = $this->resolvePostedBillCategory($request, $activeShop, $hasShopColumn);

        return $this->persistUpdate($request, $billCategory, $activeShop, $hasShopColumn);
    }

    private function persistUpdate(Request $request, BillCategory $billCategory, ?Shop $activeShop, bool $hasShopColumn): RedirectResponse
    {

        $nameRule = Rule::unique('bill_categories', 'name')->ignore($billCategory->id);
        if ($hasShopColumn && $activeShop?->exists) {
            $nameRule->where('shop_id', $activeShop->id);
        }

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                $nameRule,
            ],
            'default_description' => ['nullable', 'string', 'max:255'],
            'no_commission' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $attributes = [
            'name' => $data['name'],
        ];

        if (Schema::hasColumn('bill_categories', 'default_description')) {
            $attributes['default_description'] = $data['default_description'] ?? '';
        }

        if (Schema::hasColumn('bill_categories', 'no_commission')) {
            $attributes['no_commission'] = $request->boolean('no_commission');
        }

        if (Schema::hasColumn('bill_categories', 'is_active')) {
            $attributes['is_active'] = $request->boolean('is_active', true);
        }

        try {
            $billCategory->update($attributes);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'Failed to update POS item type. Please try again after updating the server database.');
        }

        return back()->with('success', 'Bill category updated successfully.');
    }

    public function destroy(BillCategory $billCategory): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        $hasShopColumn = Schema::hasColumn('bill_categories', 'shop_id');
        $this->assertBillCategoryBelongsToActiveShop($billCategory, $activeShop, $hasShopColumn);

        return $this->performDelete($billCategory);
    }

    public function destroyPost(Request $request): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        $hasShopColumn = Schema::hasColumn('bill_categories', 'shop_id');
        $billCategory = $this->resolvePostedBillCategory($request, $activeShop, $hasShopColumn);

        return $this->performDelete($billCategory);
    }

    private function performDelete(BillCategory $billCategory): RedirectResponse
    {

        $usageCount = BillItem::query()
            ->where('category_id', $billCategory->id)
            ->count();

        if ($usageCount > 0) {
            return back()->withErrors([
                'delete' => "Cannot delete '{$billCategory->name}' because {$usageCount} bill item(s) already use it.",
            ]);
        }

        $billCategory->delete();

        return back()->with('success', 'Bill category deleted successfully.');
    }

    private function resolvePostedBillCategory(Request $request, ?Shop $activeShop, bool $hasShopColumn): BillCategory
    {
        $billCategoryId = (int) $request->validate([
            'bill_category_id' => 'required|integer',
        ])['bill_category_id'];

        $query = BillCategory::query()->whereKey($billCategoryId);
        if ($hasShopColumn && $activeShop?->exists) {
            $query->where('shop_id', $activeShop->id);
        }

        $billCategory = $query->first();
        abort_if($billCategory === null, 404);

        return $billCategory;
    }

    private function assertBillCategoryBelongsToActiveShop(BillCategory $billCategory, ?Shop $activeShop, bool $hasShopColumn): void
    {
        if ($hasShopColumn && $activeShop?->exists) {
            abort_unless((int) $billCategory->shop_id === (int) $activeShop->id, 404);
        }
    }

    private function resolveActiveShop(): ?Shop
    {
        if (app()->bound(Shop::class)) {
            $bound = app(Shop::class);
            if ($bound instanceof Shop && $bound->exists) {
                return $bound;
            }
        }

        return Shop::query()
            ->when(
                Schema::hasColumn('shops', 'is_default'),
                fn ($query) => $query->orderByDesc('is_default')
            )
            ->when(
                Schema::hasColumn('shops', 'is_active'),
                fn ($query) => $query->where('is_active', true)
            )
            ->orderBy('id')
            ->first();
    }
}
