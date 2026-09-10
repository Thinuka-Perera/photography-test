<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CategoryController
 *
 * Handles full CRUD for product categories WITHIN the active shop.
 * Categories drive which UI view is used in the Inventory dashboard:
 *   - type 'frame'   → Frame Grid (Size + Grade filter)
 *   - type 'general' → General Stock List (Ink, Paper, Tape, etc.)
 *
 * The active shop is provided by `SetActiveShop` middleware via
 * container binding; we type-hint Shop and Laravel injects it.
 *
 * Routes:
 *   GET    /categories           → index()   List categories for the active shop
 *   POST   /categories           → store()   Create new category in the active shop
 *   PUT    /categories/{id}      → update()  Update an existing category
 *   DELETE /categories/{id}      → destroy() Delete a category (if no products)
 */
class CategoryController extends Controller
{
    /**
     * List categories belonging to the active shop, with their product
     * counts. Categories from other shops are never returned.
     *
     * @param  Shop|null $activeShop
     * @return Response|RedirectResponse
     */
    public function index(?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $categories = Category::query()
            ->forShop($activeShop->id)
            ->withCount('products')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Inventory/Categories', [
            'categories' => $categories,
        ]);
    }

    /**
     * Create a new category in the active shop. Uniqueness is per-shop
     * so the same category name may legitimately exist in two shops.
     *
     * @param  Request   $request
     * @param  Shop|null $activeShop
     * @return RedirectResponse
     */
    public function store(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:100',
                "unique:categories,name,NULL,id,shop_id,{$activeShop->id}",
            ],
            'type' => 'required|in:frame,general',
        ]);

        Category::create([
            'shop_id' => $activeShop->id,
            'name'    => $data['name'],
            'type'    => $data['type'],
        ]);

        return back()->with('success', 'Category created successfully.');
    }

    /**
     * Update an existing category. Aborts with 404 if the category
     * belongs to a different shop, preventing cross-shop edits.
     *
     * @param  Request   $request
     * @param  Category  $category
     * @param  Shop|null $activeShop
     * @return RedirectResponse
     */
    public function update(Request $request, Category $category, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $this->assertCategoryBelongsToActiveShop($category, $activeShop->id);

        return $this->persistUpdate($request, $category, $activeShop);
    }

    public function updatePost(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $category = $this->resolvePostedCategory($request, $activeShop->id);

        return $this->persistUpdate($request, $category, $activeShop);
    }

    private function persistUpdate(Request $request, Category $category, Shop $activeShop): RedirectResponse
    {

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:100',
                "unique:categories,name,{$category->id},id,shop_id,{$activeShop->id}",
            ],
            'type' => 'required|in:frame,general',
        ]);

        $category->update($data);

        return back()->with('success', 'Category updated successfully.');
    }

    /**
     * Delete a category. Refuses if products are still attached or if
     * the category belongs to a different shop.
     *
     * @param  Category  $category
     * @param  Shop|null $activeShop
     * @return RedirectResponse
     */
    public function destroy(Category $category, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $this->assertCategoryBelongsToActiveShop($category, $activeShop->id);

        return $this->performDelete($category);
    }

    public function destroyPost(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $category = $this->resolvePostedCategory($request, $activeShop->id);

        return $this->performDelete($category);
    }

    private function performDelete(Category $category): RedirectResponse
    {

        $category->delete();

        return back()->with('success', 'Category deleted successfully.');
    }

    /**
     * @param  Shop|null $activeShop
     * @return Shop|RedirectResponse
     */
    private function requireActiveShop(?Shop $activeShop)
    {
        if ($activeShop && $activeShop->exists) {
            return $activeShop;
        }

        if (app()->bound(Shop::class)) {
            $bound = app(Shop::class);
            if ($bound instanceof Shop && $bound->exists) {
                return $bound;
            }
        }

        return redirect()->route('shops.index')
            ->with('warning', 'Please select a shop before continuing.');
    }

    private function resolvePostedCategory(Request $request, int $shopId): Category
    {
        $categoryId = (int) $request->validate([
            'category_id' => 'required|integer',
        ])['category_id'];

        $category = Category::query()
            ->forShop($shopId)
            ->find($categoryId);

        abort_if($category === null, 404);

        return $category;
    }

    private function assertCategoryBelongsToActiveShop(Category $category, int $shopId): void
    {
        abort_if((int) $category->shop_id !== $shopId, 404);
    }
}
