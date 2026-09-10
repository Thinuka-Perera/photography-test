<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QuotationController extends Controller
{
    public function index(Request $request): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);

        $year = (int) ($request->input('year') ?: now()->year);
        $month = $request->filled('month') ? (int) $request->input('month') : null;

        $recentQuotationsQuery = Quotation::query()
            ->forShop($activeShop->id)
            ->whereDoesntHave('invoice')
            ->whereNotIn('status', ['converted', 'invoiced', 'accepted'])
            ->with('items')
            ->latest();

        if ($request->boolean('wedding_only', false)) {
            $recentQuotationsQuery->whereRaw('LOWER(event_type) = ?', ['wedding']);
        }

        if ($year > 0) {
            $recentQuotationsQuery->whereYear(DB::raw('COALESCE(wedding_date, event_date, created_at)'), $year);
        }

        if ($month && $month >= 1 && $month <= 12) {
            $recentQuotationsQuery->whereMonth(DB::raw('COALESCE(wedding_date, event_date, created_at)'), $month);
        }

        $recentQuotations = $recentQuotationsQuery->limit(20)->get();

        $driver = DB::getDriverName();
        
        if ($driver === 'sqlite') {
            $weddingMonthlyBreakdown = Quotation::query()
                ->forShop($activeShop->id)
                ->whereRaw('LOWER(event_type) = ?', ['wedding'])
                ->whereYear(DB::raw('COALESCE(wedding_date, event_date, created_at)'), $year)
                ->selectRaw("CAST(strftime('%m', COALESCE(wedding_date, event_date, created_at)) AS INTEGER) as month_number")
                ->selectRaw('COUNT(*) as total')
                ->groupBy(DB::raw("strftime('%m', COALESCE(wedding_date, event_date, created_at))"))
                ->orderBy('month_number')
                ->get();
        } else {
            $weddingMonthlyBreakdown = Quotation::query()
                ->forShop($activeShop->id)
                ->whereRaw('LOWER(event_type) = ?', ['wedding'])
                ->whereYear(DB::raw('COALESCE(wedding_date, event_date, created_at)'), $year)
                ->selectRaw('MONTH(COALESCE(wedding_date, event_date, created_at)) as month_number')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('month_number')
                ->orderBy('month_number')
                ->get();
        }

        $availableWeddingYears = Quotation::query()
            ->forShop($activeShop->id)
            ->whereRaw('LOWER(event_type) = ?', ['wedding'])
            ->selectRaw($driver === 'sqlite' ? "CAST(strftime('%Y', COALESCE(wedding_date, event_date, created_at)) AS INTEGER) as year" : 'YEAR(COALESCE(wedding_date, event_date, created_at)) as year')
            ->where(function ($query) {
                $query->whereNotNull('wedding_date')
                    ->orWhereNotNull('event_date')
                    ->orWhereNotNull('created_at');
            })
            ->orderByDesc('year')
            ->pluck('year')
            ->values();
 
        $stats = [
            'draft_count' => Quotation::forShop($activeShop->id)->whereDoesntHave('invoice')->whereNotIn('status', ['converted', 'invoiced', 'accepted'])->where('status', 'draft')->count(),
            'whatsapp_ready_count' => Quotation::forShop($activeShop->id)->whereDoesntHave('invoice')->whereNotIn('status', ['converted', 'invoiced', 'accepted'])->whereNotNull('customer_phone')->count(),
            'approval_rate' => $this->calculateApprovalRate(),
        ];

        $hasProductTables = \Schema::hasTable('products')
            && \Schema::hasTable('product_variants')
            && \Schema::hasTable('inventory');

        $variantPriceColumn = null;
        if ($hasProductTables) {
            if (\Schema::hasColumn('product_variants', 'selling_price')) {
                $variantPriceColumn = 'product_variants.selling_price';
            } elseif (\Schema::hasColumn('product_variants', 'price')) {
                $variantPriceColumn = 'product_variants.price';
            }
        }

        $priceSelect = $variantPriceColumn
            ? DB::raw("{$variantPriceColumn} as price")
            : DB::raw('0 as price');

        $products = $hasProductTables
            ? DB::table('product_variants')
                ->join('products', 'product_variants.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->leftJoin('inventory', function ($join) use ($activeShop) {
                    $join->on('inventory.variant_id', '=', 'product_variants.id')
                        ->where('inventory.shop_id', '=', $activeShop->id);
                })
                ->where('products.shop_id', $activeShop->id)
                ->select([
                    'product_variants.id as id',
                    'products.id as base_product_id',
                    'products.name',
                    'products.image',
                    'product_variants.sku',
                    'product_variants.barcode',
                    'product_variants.size',
                    'inventory.id as stock_item_id',
                    $priceSelect,
                    DB::raw('COALESCE(inventory.current_stock, 0) as stock'),
                    'categories.name as category_name',
                ])
                ->orderBy('products.name')
                ->orderBy('product_variants.sku')
                ->get()
                ->map(function ($product) {
                    $product->image = $product->image ? \Illuminate\Support\Facades\Storage::disk('public')->url($product->image) : null;
                    return $product;
                })
            : collect();

        $categories = $hasProductTables
            ? DB::table('categories')
                ->where('shop_id', $activeShop->id)
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
            : collect();
 
        return Inertia::render('Photography/Quotations/Index', [
            'recentQuotations' => $recentQuotations,
            'stats' => $stats,
            'weddingMonthlyBreakdown' => $weddingMonthlyBreakdown,
            'availableWeddingYears' => $availableWeddingYears,
            'filters' => [
                'year' => $year,
                'month' => $month,
                'wedding_only' => $request->boolean('wedding_only', false),
            ],
            // NEW: Pass employees so the "Convert to Invoice" button can show them
            'employees' => \App\Models\User::select('id', 'name')->orderBy('name')->get(),
            'packages' => \App\Models\PhotographyPackage::orderBy('name')->get(),
            'products' => $products,
            'categories' => $categories,
            'shopSettings' => [
                ...\App\Models\ShopSetting::all_settings(),
                'shop_logo_url' => \App\Models\ShopSetting::get('shop_logo') ? asset('storage/' . \App\Models\ShopSetting::get('shop_logo')) : null,
            ],
            'customers' => \App\Models\Customer::forShop($activeShop->id)
                ->select('id', 'name', 'phone')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);

        $quotation = DB::transaction(function () use ($data) {
            [$subtotal, $discountAmount, $totalAmount] = $this->computeTotals(
                $data['line_items'],
                $data['discount_amount'] ?? 0,
                $data['manual_total'] ?? null
            );

            $quotation = Quotation::create([
                'shop_id' => app(\App\Modules\Shops\Models\Shop::class)->id,
                'quote_number' => $this->generateQuoteNumber(),
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'] ?? null,
                'event_type' => ($data['event_type'] ?? '') ?: 'General',
                'event_date' => $data['event_date'] ?? null,
                'wedding_date' => $data['wedding_date'] ?? null,
                'homecoming_date' => $data['homecoming_date'] ?? null,
                'package_name' => $data['package_name'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'],
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'manual_total' => $data['manual_total'] ?? null,
            ]);

            foreach ($data['line_items'] as $item) {
                $quantity = (int) $item['quantity'];
                $unitPrice = $item['unit_price'] !== null && $item['unit_price'] !== '' ? (float) $item['unit_price'] : 0.0;
                $lineTotal = round($quantity * $unitPrice, 2);

                $quotation->items()->create([
                    'description' => $item['description'],
                    'product_id' => $item['product_id'] ?? null,
                    'product_sku' => $item['product_sku'] ?? null,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'color' => $item['color'] ?? null,
                ]);
            }

            return $quotation;
        });

        return back()->with('success', "Quotation {$quotation->quote_number} saved.");
    }

    public function update(Request $request, Quotation $quotation): RedirectResponse
    {
        $data = $this->validatePayload($request);

        DB::transaction(function () use ($data, $quotation) {
            [$subtotal, $discountAmount, $totalAmount] = $this->computeTotals(
                $data['line_items'],
                $data['discount_amount'] ?? 0,
                $data['manual_total'] ?? null
            );

            $quotation->update([
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'] ?? null,
                'event_type' => ($data['event_type'] ?? '') ?: 'General',
                'event_date' => $data['event_date'] ?? null,
                'wedding_date' => $data['wedding_date'] ?? null,
                'homecoming_date' => $data['homecoming_date'] ?? null,
                'package_name' => $data['package_name'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'],
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'manual_total' => $data['manual_total'] ?? null,
            ]);

            $quotation->items()->delete();

            foreach ($data['line_items'] as $item) {
                $quantity = (int) $item['quantity'];
                $unitPrice = $item['unit_price'] !== null && $item['unit_price'] !== '' ? (float) $item['unit_price'] : 0.0;
                $lineTotal = round($quantity * $unitPrice, 2);

                $quotation->items()->create([
                    'description' => $item['description'],
                    'product_id' => $item['product_id'] ?? null,
                    'product_sku' => $item['product_sku'] ?? null,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'color' => $item['color'] ?? null,
                ]);
            }
        });

        return back()->with('success', "Quotation {$quotation->quote_number} updated.");
    }

    public function destroy(Quotation $quotation): RedirectResponse
    {
        $number = $quotation->quote_number;
        $quotation->delete();

        return back()->with('success', "Quotation {$number} deleted.");
    }

    public function prepareWhatsapp(Request $request, Quotation $quotation): RedirectResponse
    {
        $data = $request->validate([
            'customer_phone' => ['required', 'string', 'max:30'],
        ]);

        $quotation->update([
            'customer_phone' => $data['customer_phone'],
        ]);

        return back()->with('success', "WhatsApp handoff prepared for {$quotation->quote_number}.");
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'event_type' => ['nullable', 'string', 'max:100'],
            'event_date' => ['nullable', 'date'],
            'wedding_date' => ['nullable', 'date'],
            'homecoming_date' => ['nullable', 'date'],
            'package_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['draft', 'awaiting_approval', 'approved', 'rejected'])],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'manual_total' => ['nullable', 'numeric', 'min:0'],
            'line_items' => ['required', 'array', 'min:1'],
            'line_items.*.description' => ['required', 'string', 'max:255'],
            'line_items.*.quantity' => ['required', 'integer', 'min:1'],
            'line_items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'line_items.*.product_id' => ['nullable', 'integer'],
            'line_items.*.product_sku' => ['nullable', 'string', 'max:100'],
            'line_items.*.color' => ['nullable', 'string', 'max:50'],
        ]);
    }

    private function computeTotals(array $lineItems, float|int $discount, float|int|string|null $manualTotal = null): array
    {
        $subtotal = 0.0;

        foreach ($lineItems as $item) {
            $unitPrice = $item['unit_price'] !== null && $item['unit_price'] !== '' ? (float) $item['unit_price'] : 0.0;
            $subtotal += ((int) $item['quantity']) * $unitPrice;
        }

        $subtotal = round($subtotal, 2);
        $discountAmount = max(0, round((float) $discount, 2));

        if ($manualTotal !== null && $manualTotal !== '') {
            $totalAmount = max(0, round((float) $manualTotal, 2));
        } else {
            $totalAmount = max(0, round($subtotal - $discountAmount, 2));
        }

        return [$subtotal, $discountAmount, $totalAmount];
    }

    private function generateQuoteNumber(): string
    {
        $prefix = now()->format('Ymd');
        $latest = Quotation::query()
            ->whereDate('created_at', now()->toDateString())
            ->latest('id')
            ->first();

        $nextSequence = 1;

        if ($latest && preg_match('/^QT-\d{8}-(\d{4})$/', $latest->quote_number, $matches)) {
            $nextSequence = ((int) $matches[1]) + 1;
        }

        return "QT-{$prefix}-".str_pad((string) $nextSequence, 4, '0', STR_PAD_LEFT);
    }

    private function calculateApprovalRate(): int
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $approved = Quotation::forShop($activeShop->id)->where('status', 'approved')->count();
        $considered = Quotation::forShop($activeShop->id)->whereIn('status', ['awaiting_approval', 'approved', 'rejected'])->count();

        if ($considered === 0) {
            return 0;
        }

        return (int) round(($approved / $considered) * 100);
    }
}
