<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ProductController
 *
 * Handles all CRUD operations for Products and their Variants WITHIN
 * the active shop. Each product can have multiple variants (different
 * sizes and grades). The frontend sends variants as an array in the
 * product payload, and this controller handles creating/updating/
 * deleting them together with the parent product in a single request.
 *
 * SKU and barcode generation are handled automatically by the
 * ProductVariant model's boot() method — no controller logic needed.
 * The variant boot hook also inherits shop_id from the parent product
 * and seeds an Inventory row for the same shop, so per-shop stock
 * counters are wired up the moment a product is created.
 *
 * Routes handled:
 *   GET    /products              → index()   List products in active shop
 *   POST   /products              → store()   Create product + variants
 *   GET    /products/{id}         → show()    Single product detail
 *   PUT    /products/{id}         → update()  Update product + sync variants
 *   DELETE /products/{id}         → destroy() Delete product (cascades)
 */
class ProductController extends Controller
{
    /**
     * Display a paginated list of products belonging to the active shop.
     *
     * @param  Shop|null $activeShop
     * @return Response|RedirectResponse
     */
    public function index(Request $request, ?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $search = $request->get('search');
        $location = $request->get('location');

        $products = Product::query()
            ->forShop($activeShop->id)
            ->with(['category', 'variants.inventory'])
            ->when($location, function ($query, $location) {
                return $query->where('products.location', $location);
            })
            ->search($search)
            ->latest()
            ->paginate(16)
            ->withQueryString();

        $categories = Category::query()
            ->forShop($activeShop->id)
            ->orderBy('name')
            ->get();

        $locations = Product::query()
            ->forShop($activeShop->id)
            ->whereNotNull('location')
            ->where('location', '<>', '')
            ->distinct()
            ->pluck('location')
            ->all();

        return Inertia::render('Inventory/Products', [
            'products'   => $products,
            'categories' => $categories,
            'filters'    => [
                'search'   => $search,
                'location' => $location,
            ],
            'locations'  => $locations,
        ]);
    }

    /**
     * Store a newly created product (and its variants) in the active shop.
     * The product's shop_id and each variant's shop_id are derived from
     * the active shop — clients never need to send shop_id explicitly.
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
            'name'                          => 'required|string|max:255',
            'category_id'                   => 'required|exists:categories,id',
            'description'                   => 'nullable|string',
            'uom'                           => 'required|string|max:50',
            'image'                         => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'location'                      => 'nullable|string|max:255',
            'metadata'                      => 'nullable|array',
            'variants'                      => 'required|array|min:1',
            'variants.*.size'               => 'nullable|string|max:50',
            'variants.*.grade_type'         => 'nullable|string|max:50',
            'variants.*.sku'                => [
                'nullable', 'string', 'max:100',
                "unique:product_variants,sku,NULL,id,shop_id,{$activeShop->id}",
            ],
            'variants.*.barcode'            => [
                'nullable', 'string', 'max:100',
                "unique:product_variants,barcode,NULL,id,shop_id,{$activeShop->id}",
            ],
            'variants.*.cost_price'         => 'required|numeric|min:0',
            'variants.*.selling_price'      => 'required|numeric|min:0',
        ]);

        // Guard: chosen category must belong to the active shop
        $this->assertCategoryBelongsToShop((int) $data['category_id'], $activeShop->id);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product = Product::create([
            'shop_id'     => $activeShop->id,
            'name'        => $data['name'],
            'category_id' => $data['category_id'],
            'description' => $data['description'] ?? null,
            'uom'         => $data['uom'],
            'image'       => $imagePath,
            'location'    => $data['location'] ?? null,
            'metadata'    => $data['metadata'] ?? null,
        ]);

        // Variants inherit shop_id automatically via ProductVariant::boot()
        foreach ($data['variants'] as $index => $variantData) {
            $product->variants()->create([
                ...$variantData,
                'sort_order' => $index,
            ]);
        }

        return redirect()->route('products.index')
            ->with('success', 'Product created successfully.');
    }

    /**
     * Show a single product (must belong to the active shop) with all
     * variants and full stock log history.
     *
     * @param  Product   $product
     * @param  Shop|null $activeShop
     * @return Response|RedirectResponse
     */
    public function show(Product $product, ?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        abort_if($product->shop_id !== $activeShop->id, 404);

        $product->load(['variants']);

        $variant = $product->variants->first();

        if (! $variant) {
            return redirect()
                ->route('products.index')
                ->with('warning', 'This product has no variants yet.');
        }

        return redirect()->route('inventory.logs', $variant);
    }

    /**
     * Update an existing product (must belong to the active shop) and
     * sync its variants.
     *
     * Variant sync strategy:
     *   - Variants in the request with an 'id' → update existing
     *   - Variants in the request without an 'id' → create new
     *   - Existing variants NOT in the request → deleted (cascade cleans up inventory + logs)
     *
     * @param  Request   $request
     * @param  Product   $product
     * @param  Shop|null $activeShop
     * @return RedirectResponse
     */
    public function update(Request $request, Product $product, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $this->assertProductBelongsToShop($product, $activeShop->id);

        return $this->persistUpdate($request, $product, $activeShop);
    }

    /**
     * Shared-hosting-safe update endpoint that resolves the product from the
     * request body instead of the URL path.
     */
    public function updatePost(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $product = $this->resolvePostedProduct($request, $activeShop->id);

        return $this->persistUpdate($request, $product, $activeShop);
    }

    /**
     * Apply an update to the given product after shop ownership has been
     * resolved by either route-model binding or request-body lookup.
     */
    private function persistUpdate(Request $request, Product $product, Shop $activeShop): RedirectResponse
    {

        $data = $request->validate([
            'name'                          => 'required|string|max:255',
            'category_id'                   => 'required|exists:categories,id',
            'description'                   => 'nullable|string',
            'uom'                           => 'required|string|max:50',
            'image'                         => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'location'                      => 'nullable|string|max:255',
            'metadata'                      => 'nullable|array',
            'variants'                      => 'required|array|min:1',
            'variants.*.id'                 => 'nullable|exists:product_variants,id',
            'variants.*.size'               => 'nullable|string|max:50',
            'variants.*.grade_type'         => 'nullable|string|max:50',
            'variants.*.sku'                => 'nullable|string|max:100',
            'variants.*.barcode'            => 'nullable|string|max:100',
            'variants.*.cost_price'         => 'required|numeric|min:0',
            'variants.*.selling_price'      => 'required|numeric|min:0',
        ]);

        $this->assertCategoryBelongsToShop((int) $data['category_id'], $activeShop->id);

        $imagePath = $product->image;
        if ($request->hasFile('image')) {
            if ($product->image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($product->image);
            }
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product->update([
            'name'        => $data['name'],
            'category_id' => $data['category_id'],
            'description' => $data['description'] ?? null,
            'uom'         => $data['uom'],
            'image'       => $imagePath,
            'location'    => $data['location'] ?? null,
            'metadata'    => $data['metadata'] ?? null,
        ]);

        $keepIds = collect($data['variants'])->pluck('id')->filter()->all();

        $product->variants()->whereNotIn('id', $keepIds)->delete();

        foreach ($data['variants'] as $index => $variantData) {
            if (! empty($variantData['id'])) {
                ProductVariant::query()
                    ->where('id', $variantData['id'])
                    ->where('shop_id', $activeShop->id)
                    ->update([
                        'sort_order'    => $index,
                        'size'          => $variantData['size'] ?? null,
                        'grade_type'    => $variantData['grade_type'] ?? null,
                        'sku'           => $variantData['sku'],
                        'barcode'       => $variantData['barcode'] ?? null,
                        'cost_price'    => $variantData['cost_price'],
                        'selling_price' => $variantData['selling_price'],
                    ]);
            } else {
                $product->variants()->create([
                    ...$variantData,
                    'sort_order' => $index,
                ]);
            }
        }

        return redirect()->route('products.index')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Delete a product (must belong to the active shop). Cascade delete
     * (defined in migrations) handles variants → inventory → stock_logs.
     *
     * @param  Product   $product
     * @param  Shop|null $activeShop
     * @return RedirectResponse
     */
    public function destroy(Product $product, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $this->assertProductBelongsToShop($product, $activeShop->id);

        return $this->performDelete($product);
    }

    /**
     * Shared-hosting-safe delete endpoint that resolves the product from the
     * request body instead of the URL path.
     */
    public function destroyPost(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $product = $this->resolvePostedProduct($request, $activeShop->id);

        return $this->performDelete($product);
    }

    /**
     * Delete the product after ownership has already been checked.
     */
    private function performDelete(Product $product): RedirectResponse
    {

        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Product deleted successfully.');
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

    /**
     * @param  int $categoryId
     * @param  int $shopId
     * @return void
     */
    private function assertCategoryBelongsToShop(int $categoryId, int $shopId): void
    {
        $belongs = Category::query()
            ->whereKey($categoryId)
            ->where('shop_id', $shopId)
            ->exists();

        abort_unless($belongs, 422, 'Category does not belong to the active shop.');
    }

    /**
     * Resolve a product id posted in the request body within the active shop.
     */
    private function resolvePostedProduct(Request $request, int $shopId): Product
    {
        $productId = (int) $request->validate([
            'product_id' => 'required|integer',
        ])['product_id'];

        $product = Product::query()
            ->forShop($shopId)
            ->find($productId);

        abort_if($product === null, 404);

        return $product;
    }

    /**
     * Ensure the resolved product belongs to the active shop.
     */
    private function assertProductBelongsToShop(Product $product, int $shopId): void
    {
        abort_if((int) $product->shop_id !== $shopId, 404);
    }

    /**
     * Parse row uploads and return update/create vs error validation summary.
     */
    public function importPreview(Request $request, ?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return response()->json(['error' => 'Active shop required'], 400);
        }

        $data = $request->validate([
            'rows' => 'required|array',
        ]);

        $rows = $data['rows'];
        $updates = [];
        $creates = [];
        $errors = [];

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2; // Usually line 1 is headers in Excel
            
            // Normalize case-insensitive keys
            $rowNormalized = [];
            foreach ($row as $key => $val) {
                $rowNormalized[strtolower(trim($key))] = $val;
            }
            
            $sku = isset($rowNormalized['sku']) ? trim($rowNormalized['sku']) : '';
            $name = isset($rowNormalized['name']) ? trim($rowNormalized['name']) : '';
            $categoryName = isset($rowNormalized['category']) ? trim($rowNormalized['category']) : '';
            $stockVal = isset($rowNormalized['stock']) ? trim($rowNormalized['stock']) : '';
            $costVal = isset($rowNormalized['cost price']) ? trim($rowNormalized['cost price']) : '';
            $sellingVal = isset($rowNormalized['selling price']) ? trim($rowNormalized['selling price']) : '';
            $size = isset($rowNormalized['size']) ? trim($rowNormalized['size']) : '';
            $grade = isset($rowNormalized['grade / type']) ? trim($rowNormalized['grade / type']) : '';
            $uom = isset($rowNormalized['uom']) ? trim($rowNormalized['uom']) : 'unit';

            if (empty($sku) && empty($name)) {
                $errors[] = [
                    'line' => $lineNum,
                    'sku' => 'N/A',
                    'name' => 'N/A',
                    'error' => 'Either SKU/Barcode or Product Name is required.'
                ];
                continue;
            }

            // Clean number inputs
            $stock = $stockVal !== '' ? intval($stockVal) : null;
            $cost = $costVal !== '' ? floatval($costVal) : null;
            $selling = $sellingVal !== '' ? floatval($sellingVal) : null;

            if ($stockVal !== '' && !preg_match('/^-?\d+$/', $stockVal)) {
                $errors[] = [
                    'line' => $lineNum,
                    'sku' => $sku ?: 'N/A',
                    'name' => $name ?: 'Unknown',
                    'error' => 'Stock quantity must be a valid integer.'
                ];
                continue;
            }

            if ($costVal !== '' && (!is_numeric($costVal) || floatval($costVal) < 0)) {
                $errors[] = [
                    'line' => $lineNum,
                    'sku' => $sku ?: 'N/A',
                    'name' => $name ?: 'Unknown',
                    'error' => 'Cost Price must be a non-negative number.'
                ];
                continue;
            }

            if ($sellingVal !== '' && (!is_numeric($sellingVal) || floatval($sellingVal) < 0)) {
                $errors[] = [
                    'line' => $lineNum,
                    'sku' => $sku ?: 'N/A',
                    'name' => $name ?: 'Unknown',
                    'error' => 'Selling Price must be a non-negative number.'
                ];
                continue;
            }

            // Look up matching Variant
            $variant = null;
            $existingProduct = null;

            if (!empty($sku)) {
                $variant = ProductVariant::query()
                    ->where('shop_id', $activeShop->id)
                    ->where(function($q) use ($sku) {
                        $q->where('sku', $sku)->orWhere('barcode', $sku);
                    })
                    ->with(['product.category', 'inventory'])
                    ->first();
            } else {
                // SKU is empty, check if Product exists by Name (case-insensitive approximation)
                $existingProduct = Product::query()
                    ->where('shop_id', $activeShop->id)
                    ->where('name', $name)
                    ->first();

                if ($existingProduct) {
                    // Try to match variant by size and grade
                    $variant = ProductVariant::query()
                        ->where('shop_id', $activeShop->id)
                        ->where('product_id', $existingProduct->id)
                        ->where('size', $size ?: null)
                        ->where('grade_type', $grade ?: null)
                        ->with(['product.category', 'inventory'])
                        ->first();
                }
            }

            if ($variant) {
                // UPDATE flow
                $currentStock = $variant->inventory->current_stock ?? 0;
                $stockChange = $stock !== null ? $stock : 0;
                $updates[] = [
                    'line' => $lineNum,
                    'variant_id' => $variant->id,
                    'sku' => $variant->sku,
                    'name' => $variant->product->name,
                    'size' => $variant->size,
                    'grade' => $variant->grade_type,
                    'category' => $variant->product->category->name ?? 'Uncategorized',
                    'current_stock' => $currentStock,
                    'new_stock' => $currentStock + $stockChange,
                    'stock_change' => $stockChange,
                    'current_cost' => floatval($variant->cost_price),
                    'new_cost' => $cost !== null ? $cost : floatval($variant->cost_price),
                    'current_selling' => floatval($variant->selling_price),
                    'new_selling' => $selling !== null ? $selling : floatval($variant->selling_price),
                ];
            } else {
                // CREATE flow (New Product/Variant)
                if (empty($name)) {
                    $errors[] = [
                        'line' => $lineNum,
                        'sku' => $sku,
                        'name' => 'N/A',
                        'error' => "SKU '{$sku}' does not exist, and 'Name' is empty. Fill Name to create a new product."
                    ];
                    continue;
                }

                if ($stock !== null && $stock < 0) {
                    $errors[] = [
                        'line' => $lineNum,
                        'sku' => $sku ?: 'Auto-generated',
                        'name' => $name,
                        'error' => 'Opening stock for a new product cannot be negative.'
                    ];
                    continue;
                }

                $isNewProduct = !$existingProduct;
                if (empty($sku) && !$existingProduct) {
                    // Double check if there is an existing Product Name in DB
                    $isNewProduct = !Product::query()
                        ->where('shop_id', $activeShop->id)
                        ->where('name', $name)
                        ->exists();
                }

                $creates[] = [
                    'line' => $lineNum,
                    'sku' => $sku ?: '',
                    'name' => $name,
                    'category_name' => $categoryName ?: 'General',
                    'size' => $size ?: null,
                    'grade' => $grade ?: null,
                    'uom' => $uom ?: 'unit',
                    'stock' => $stock !== null ? $stock : 0,
                    'cost' => $cost !== null ? $cost : 0.0,
                    'selling' => $selling !== null ? $selling : 0.0,
                    'creates_new_product' => $isNewProduct,
                ];
            }
        }

        return response()->json([
            'updates' => $updates,
            'creates' => $creates,
            'errors' => $errors
        ]);
    }

    /**
     * Accept verified updates and creates, executing operations inside db trans.
     */
    public function importSubmit(Request $request, ?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return redirect()->route('products.index')->with('error', 'Active shop required.');
        }

        $data = $request->validate([
            'updates' => 'nullable|array',
            'creates' => 'nullable|array',
        ]);

        $updates = $data['updates'] ?? [];
        $creates = $data['creates'] ?? [];

        \Illuminate\Support\Facades\DB::transaction(function () use ($activeShop, $updates, $creates) {
            $stockService = app(\App\Services\StockService::class);

            // 1. Process Updates
            foreach ($updates as $up) {
                $variant = ProductVariant::query()
                    ->where('shop_id', $activeShop->id)
                    ->where('id', $up['variant_id'])
                    ->first();

                if (!$variant) continue;

                // Update prices
                $variant->cost_price = $up['new_cost'];
                $variant->selling_price = $up['new_selling'];
                $variant->save();

                // Adjust Stock using change delta directly
                $stockChange = floatval($up['stock_change'] ?? 0);

                if ($stockChange > 0) {
                    $stockService->recordIn(
                        $activeShop->id,
                        $variant->id,
                        $stockChange,
                        'Purchase',
                        null,
                        $up['new_cost'],
                        null,
                        null,
                        'Excel Bulk Import Update'
                    );
                } elseif ($stockChange < 0) {
                    $stockService->recordOut(
                        $activeShop->id,
                        $variant->id,
                        -$stockChange,
                        'Adjustment',
                        null,
                        'Excel Bulk Import Update'
                    );
                }
            }

            // 2. Process Creates
            foreach ($creates as $cr) {
                // Find or create Category
                $catName = trim($cr['category_name']);
                $category = Category::query()
                    ->where('shop_id', $activeShop->id)
                    ->where('name', 'like', $catName)
                    ->first();

                if (!$category) {
                    $category = Category::create([
                        'shop_id' => $activeShop->id,
                        'name' => $catName,
                        'description' => 'Created via Excel import'
                    ]);
                }

                // Find or create parent Product by Name
                $prodName = trim($cr['name']);
                $uom = trim($cr['uom'] ?: 'unit');
                $product = Product::query()
                    ->where('shop_id', $activeShop->id)
                    ->where('name', $prodName)
                    ->first();

                if (!$product) {
                    $product = Product::create([
                        'shop_id' => $activeShop->id,
                        'name' => $prodName,
                        'category_id' => $category->id,
                        'uom' => $uom,
                        'description' => 'Imported via Excel'
                    ]);
                }

                // Check if Variant SKU already exists in DB
                $dup = false;
                if (!empty($cr['sku'])) {
                    $dup = ProductVariant::query()
                        ->where('shop_id', $activeShop->id)
                        ->where('sku', $cr['sku'])
                        ->exists();
                }

                if ($dup) continue;

                // Create Variant
                $variant = $product->variants()->create([
                    'sort_order' => $product->variants()->count(),
                    'size' => $cr['size'] ?: null,
                    'grade_type' => $cr['grade'] ?: null,
                    'sku' => !empty($cr['sku']) ? $cr['sku'] : null,
                    'barcode' => !empty($cr['sku']) ? $cr['sku'] : null,
                    'cost_price' => floatval($cr['cost']),
                    'selling_price' => floatval($cr['selling']),
                ]);

                // Set initial stock balance
                $stockQty = floatval($cr['stock']);
                if ($stockQty > 0) {
                    $stockService->recordIn(
                        $activeShop->id,
                        $variant->id,
                        $stockQty,
                        'Opening Balance',
                        null,
                        floatval($cr['cost']),
                        null,
                        null,
                        'Excel Bulk Import Creation'
                    );
                }
            }
        });

        return redirect()->route('inventory.index')->with('success', 'Inventory Excel import processed successfully.');
    }
}
