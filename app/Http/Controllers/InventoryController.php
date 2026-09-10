<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;
use App\Models\StockLog;
use App\Modules\Shops\Models\Shop;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * InventoryController
 *
 * Handles the Inventory dashboard and stock movement (IN/OUT) operations
 * within the scope of the user's currently active Shop.
 *
 * The active Shop is resolved by `SetActiveShop` middleware and bound
 * into the service container as a `Shop` instance, which we type-hint
 * here so the controller stays unaware of where the shop came from.
 *
 * Responsibilities:
 *   - Dashboard listing of variants for the active shop (frame + general)
 *   - Stock IN / Stock OUT submissions delegated to StockService
 *   - Per-variant stock log history
 *   - Stock Tracking page
 *   - Purchase History ledger (derived from stock IN entries)
 *
 * Out of scope: Product CRUD lives in ProductController; Category CRUD
 * lives in CategoryController; the Shops module lives in
 * App\Modules\Shops.
 *
 * Routes handled:
 *   GET  /inventory                → index()      Dashboard
 *   POST /inventory/stock-in       → stockIn()    Record IN
 *   POST /inventory/stock-out      → stockOut()   Record OUT
 *   GET  /inventory/logs/{variant} → logs()       Variant history
 *   GET  /inventory/stock          → stock()      Stock tracking
 *   GET  /inventory/purchases      → purchases()  Purchase ledger
 */
class InventoryController extends Controller
{
    /**
     * @param  StockService $stockService
     */
    public function __construct(protected StockService $stockService) {}

    /**
     * Display the main inventory dashboard for the active shop.
     *
     * If no shop is active (rare — only in fresh installs before the
     * default shop is seeded) the user is sent to the shops landing
     * page so they can pick one.
     *
     * @param  Request   $request
     * @param  Shop|null $activeShop  Container-bound active shop (nullable for safety)
     * @return Response|RedirectResponse
     */
    public function index(Request $request, ?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $allVariants = ProductVariant::query()
            ->forShop($activeShop->id)
            ->with(['product.category', 'inventory'])
            ->get();

        $frameVariants   = $allVariants->filter(fn ($v) => $v->product?->category?->type === 'frame')->values();
        $generalVariants = $allVariants->filter(fn ($v) => $v->product?->category?->type === 'general')->values();

        $lowStockItems = $this->stockService->getLowStockItems($activeShop->id);

        return Inertia::render('Inventory/Index', [
            'frameVariants'   => $frameVariants,
            'generalVariants' => $generalVariants,
            'lowStockItems'   => $lowStockItems,
            'lowStockCount'   => $lowStockItems->count(),
        ]);
    }

    /**
     * Record a Stock IN transaction for the active shop.
     *
     * Delegates the heavy lifting to StockService::recordIn() inside a
     * DB transaction.
     *
     * @param  Request   $request
     * @param  Shop|null $activeShop
     * @return RedirectResponse
     */
    public function stockIn(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $data = $request->validate([
            'variant_id'    => 'required|exists:product_variants,id',
            'quantity'      => 'required|numeric|min:0.01',
            'reason'        => 'nullable|string|max:255',
            'date'          => 'required|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'other_cost'    => 'nullable|numeric|min:0',
            'notes'         => 'nullable|string|max:1000',
        ]);

        $this->assertVariantBelongsToShop((int) $data['variant_id'], $activeShop->id);

        $this->stockService->recordIn(
            shopId:       $activeShop->id,
            variantId:    (int) $data['variant_id'],
            quantity:     (float) $data['quantity'],
            reason:       $data['reason'] ?? 'Purchase',
            date:         $data['date'],
            purchaseCost: $data['purchase_cost'] ?? null,
            shippingCost: $data['shipping_cost'] ?? null,
            otherCost:    $data['other_cost'] ?? null,
            notes:        $data['notes'] ?? null,
        );

        return back()->with('success', 'Stock IN recorded successfully.');
    }

    /**
     * Store a new shipment (batch) as a new ProductVariant and record initial stock.
     */
    public function storeShipment(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $data = $request->validate([
            'product_id'    => 'required|exists:products,id',
            'cost_price'    => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'quantity'      => 'required|numeric|min:0.01',
            'size'          => 'nullable|string|max:50',
            'grade_type'    => 'nullable|string|max:50',
            'date'          => 'required|date',
            'reason'        => 'nullable|string|max:255',
            'notes'         => 'nullable|string|max:1000',
        ]);

        $product = \App\Models\Product::where('shop_id', $activeShop->id)
            ->findOrFail($data['product_id']);

        \Illuminate\Support\Facades\DB::transaction(function () use ($data, $product, $activeShop) {
            // Create the new variant for this shipment
            $variant = $product->variants()->create([
                'shop_id'       => $activeShop->id,
                'cost_price'    => $data['cost_price'],
                'selling_price' => $data['selling_price'],
                'size'          => $data['size'] ?? null,
                'grade_type'    => $data['grade_type'] ?? null,
                'sort_order'    => $product->variants()->count(),
            ]);

            // Record initial stock for this shipment
            $this->stockService->recordIn(
                shopId:       $activeShop->id,
                variantId:    $variant->id,
                quantity:     (float) $data['quantity'],
                reason:       $data['reason'] ?? 'New Shipment',
                date:         $data['date'],
                purchaseCost: $data['cost_price'],
                notes:        $data['notes'] ?? null,
            );
        });

        return back()->with('success', 'New shipment added successfully.');
    }

    /**
     * Record a Stock OUT transaction for the active shop.
     *
     * @param  Request   $request
     * @param  Shop|null $activeShop
     * @return RedirectResponse
     */
    public function stockOut(Request $request, ?Shop $activeShop = null): RedirectResponse
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $data = $request->validate([
            'variant_id' => 'required|exists:product_variants,id',
            'quantity'   => 'required|numeric|min:0.01',
            'reason'     => 'nullable|string|max:255',
            'date'       => 'required|date',
            'notes'      => 'nullable|string|max:1000',
        ]);

        $this->assertVariantBelongsToShop((int) $data['variant_id'], $activeShop->id);

        try {
            $this->stockService->recordOut(
                shopId:    $activeShop->id,
                variantId: (int) $data['variant_id'],
                quantity:  (float) $data['quantity'],
                reason:    $data['reason'] ?? 'Sale',
                date:      $data['date'],
                notes:     $data['notes'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['quantity' => $e->getMessage()]);
        }

        return back()->with('success', 'Stock OUT recorded successfully.');
    }

    /**
     * Display paginated stock log history for a single variant within
     * the active shop. Aborts with 404 if the variant belongs to a
     * different shop — prevents cross-shop data leakage via URL guessing.
     *
     * @param  ProductVariant $variant
     * @param  Shop|null      $activeShop
     * @return Response|RedirectResponse
     */
    public function logs(ProductVariant $variant, ?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $variant->loadMissing('product');

        $variantShopId = (int) ($variant->shop_id ?: $variant->product?->shop_id);

        abort_if($variantShopId !== (int) $activeShop->id, 404);

        $variant->load(['product.category', 'inventory']);

        $logs = StockLog::query()
            ->where('variant_id', $variant->id)
            ->where('shop_id', $activeShop->id)
            ->with('user')
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        // Compute the running balance over the full history for this variant in this shop
        $allLogs = StockLog::query()
            ->where('variant_id', $variant->id)
            ->where('shop_id', $activeShop->id)
            ->orderBy('date')
            ->orderBy('created_at')
            ->get();

        $runningBalance = 0;
        $balanceMap = [];
        foreach ($allLogs as $log) {
            $runningBalance += ($log->type === 'IN' ? $log->quantity : -$log->quantity);
            $balanceMap[$log->id] = $runningBalance;
        }

        $logs->getCollection()->transform(function ($log) use ($balanceMap) {
            $log->balance = $balanceMap[$log->id] ?? 0;
            return $log;
        });

        return Inertia::render('Inventory/StockLog', [
            'variant' => $variant,
            'logs'    => $logs,
        ]);
    }

    /**
     * Display the Stock Tracking page for the active shop.
     *
     * @param  Shop|null $activeShop
     * @return Response|RedirectResponse
     */
    public function stock(?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $variants = ProductVariant::query()
            ->forShop($activeShop->id)
            ->with(['product.category', 'inventory'])
            ->get();

        $stockItems = $variants->map(function ($variant) {
            $current   = $variant->inventory?->current_stock ?? 0;
            $threshold = $variant->inventory?->low_stock_threshold ?? 10;

            if ($current < $threshold) {
                $status = 'critical';
            } elseif ($current < $threshold * 1.5) {
                $status = 'low';
            } else {
                $status = 'healthy';
            }

            $variantLabel = implode(' / ', array_filter([$variant->size, $variant->grade_type]));
            $name = $variant->product?->name . ($variantLabel ? " — {$variantLabel}" : '');

            return [
                'id'            => $variant->id,
                'product_id'    => $variant->product_id,
                'name'          => $name,
                'sku'           => $variant->sku,
                'barcode'       => $variant->barcode,
                'module'        => $variant->product?->category?->name ?? 'General',
                'uom'           => $variant->product?->uom ?? 'unit',
                'cost_price'    => $variant->cost_price,
                'selling_price' => $variant->selling_price,
                'image_url'     => $variant->product?->image_url,
                'location'      => $variant->product?->location,
                'current'       => $current,
                'reorderAt'     => $threshold,
                'status'        => $status,
            ];
        });

        return Inertia::render('Inventory/Stock', [
            'stockItems' => $stockItems,
        ]);
    }

    /**
     * Display the purchase ledger for the active shop, derived from
     * stock-in entries with reason='Purchase'.
     *
     * @param  Request   $request
     * @param  Shop|null $activeShop
     * @return Response|RedirectResponse
     */
    public function purchases(Request $request, ?Shop $activeShop = null)
    {
        $activeShop = $this->requireActiveShop($activeShop);
        if ($activeShop instanceof RedirectResponse) {
            return $activeShop;
        }

        $filters = $request->validate([
            'search' => 'nullable|string|max:255',
            'from'   => 'nullable|date',
            'to'     => 'nullable|date|after_or_equal:from',
        ]);

        $search = trim($filters['search'] ?? '');

        $query = StockLog::query()
            ->where('shop_id', $activeShop->id)
            ->where('type', 'IN')
            ->where('reason', 'Purchase')
            ->with(['variant.product.category', 'user']);

        if ($search !== '') {
            $query->where(function ($ledgerQuery) use ($search) {
                $ledgerQuery
                    ->whereHas('variant', function ($variantQuery) use ($search) {
                        $variantQuery
                            ->where('sku', 'like', "%{$search}%")
                            ->orWhere('size', 'like', "%{$search}%")
                            ->orWhere('grade_type', 'like', "%{$search}%")
                            ->orWhereHas('product', fn ($productQuery) => $productQuery->where('name', 'like', "%{$search}%"));
                    })
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"));
            });
        }

        if (!empty($filters['from'])) {
            $query->whereDate('date', '>=', $filters['from']);
        }

        if (!empty($filters['to'])) {
            $query->whereDate('date', '<=', $filters['to']);
        }

        $ledgerRows = (clone $query)->get();

        $entries = $query
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString()
            ->through(function (StockLog $log) {
                $variant = $log->variant;
                $product = $variant?->product;
                $variantLabel = implode(' / ', array_filter([$variant?->size, $variant?->grade_type]));
                $unitCost     = (float) ($log->purchase_cost ?? 0);
                $shippingCost = (float) ($log->shipping_cost ?? 0);
                $otherCost    = (float) ($log->other_cost ?? 0);

                return [
                    'id'            => $log->id,
                    'date'          => $log->date?->toDateString(),
                    'product_name'  => $product?->name ?? 'Unknown Item',
                    'variant_label' => $variantLabel,
                    'category'      => $product?->category?->name,
                    'sku'           => $variant?->sku,
                    'quantity'      => $log->quantity,
                    'unit_cost'     => $unitCost,
                    'shipping_cost' => $shippingCost,
                    'other_cost'    => $otherCost,
                    'line_total'    => ($unitCost * $log->quantity) + $shippingCost + $otherCost,
                    'notes'         => $log->notes,
                    'recorded_by'   => $log->user?->name ?? 'System',
                ];
            });

        $totalValue = $ledgerRows->sum(fn (StockLog $log) => ((float) ($log->purchase_cost ?? 0) * $log->quantity)
            + (float) ($log->shipping_cost ?? 0)
            + (float) ($log->other_cost ?? 0));

        $currentMonthValue = $ledgerRows
            ->filter(fn (StockLog $log) => $log->date?->isSameMonth(now()))
            ->sum(fn (StockLog $log) => ((float) ($log->purchase_cost ?? 0) * $log->quantity)
                + (float) ($log->shipping_cost ?? 0)
                + (float) ($log->other_cost ?? 0));

        return Inertia::render('Inventory/Purchases', [
            'entries' => $entries,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'from'   => $filters['from'] ?? '',
                'to'     => $filters['to'] ?? '',
            ],
            'stats'   => [
                'entries'             => $ledgerRows->count(),
                'units'               => $ledgerRows->sum('quantity'),
                'total_value'         => $totalValue,
                'current_month_value' => $currentMonthValue,
            ],
        ]);
    }

    // ─────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────

    /**
     * Require a persisted active shop. Falls back to the container
     * binding placed by SetActiveShop middleware; if no real shop is
     * available, sends the user to the shops landing page rather than
     * rendering with null data.
     *
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
     * Guard that the variant referenced in a stock movement actually
     * belongs to the shop the request is targeting.
     *
     * @param  int $variantId
     * @param  int $shopId
     * @return void
     */
    private function assertVariantBelongsToShop(int $variantId, int $shopId): void
    {
        $belongs = ProductVariant::query()
            ->whereKey($variantId)
            ->where('shop_id', $shopId)
            ->exists();

        abort_unless($belongs, 422, 'Variant does not belong to the active shop.');
    }
}
