<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\Employee;
use App\Models\Event;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Quotation;
use App\Models\StockLog;
use App\Modules\Shops\Models\Shop;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(private InvoiceService $invoiceService) {}

    private const LOW_STOCK_PER_PAGE = 10;

    public function index(Request $request)
    {
        $shop = app(Shop::class);
        $shopId = $shop->id;
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $totalProducts = Product::forShop($shopId)->count();
        $totalSKUs = ProductVariant::forShop($shopId)->count();
        $totalInventory = (int) Inventory::forShop($shopId)->sum('current_stock');

        $lowStockQuery = ProductVariant::forShop($shopId)
            ->with(['product.category', 'inventory'])
            ->whereHas('inventory', function ($q) {
                $q->whereColumn('inventory.current_stock', '<=', 'inventory.low_stock_threshold');
            })
            ->orderByRaw(
                '(SELECT current_stock FROM inventory WHERE inventory.variant_id = product_variants.id LIMIT 1) ASC'
            )
            ->orderBy('product_variants.id');

        $lowStockCount = (clone $lowStockQuery)->count();

        $lowStockProducts = $lowStockQuery
            ->paginate(self::LOW_STOCK_PER_PAGE, ['*'], 'low_stock_page')
            ->withQueryString()
            ->through(fn (ProductVariant $variant) => $this->formatLowStockRow($variant));

        $topProducts = Product::forShop($shopId)
            ->with(['variants.inventory', 'category'])
            ->get()
            ->map(function (Product $product) {
                $totalStock = $product->variants->sum(fn ($v) => $v->inventory?->current_stock ?? 0);
                $hasLowStock = $product->variants->contains(function ($v) {
                    return ($v->inventory?->current_stock ?? 0) <= ($v->inventory?->low_stock_threshold ?? 0);
                });

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'total_stock' => $totalStock,
                    'uom' => $product->uom ?? 'unit',
                    'category' => $product->category?->name ?? 'Uncategorised',
                    'image_url' => $product->image_url ?? null,
                    'has_low_stock' => $hasLowStock,
                ];
            })
            ->sortByDesc('total_stock')
            ->take(5)
            ->values();

        $financeStats = $this->invoiceService->getFinanceStats();

        $billsToday = Bill::forShop($shopId)->whereDate('created_at', $today)->count();
        $billsYesterday = Bill::forShop($shopId)->whereDate('created_at', $yesterday)->count();
        $billsTrendPct = $this->dayOverDayPercent($billsToday, $billsYesterday);

        $upcomingShoots = Event::forShop($shopId)
            ->whereDate('event_date', '>=', $today)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        $approvedQuotations = Quotation::forShop($shopId)->where('status', 'approved')->count();

        $dailySnapshot = [
            [
                'id' => 'studio-orders-today',
                'title' => 'Studio Orders Today',
                'value' => (string) $billsToday,
                'percentage' => $billsTrendPct,
                'trend' => ($billsTrendPct ?? 0) >= 0 ? 'up' : 'down',
                'icon' => 'printer',
                'linkHref' => '/studio/sales',
            ],
            [
                'id' => 'upcoming-shoots',
                'title' => 'Upcoming Shoots',
                'value' => (string) $upcomingShoots,
                'percentage' => null,
                'trend' => 'up',
                'icon' => 'camera',
                'linkHref' => '/photography/events',
            ],
            [
                'id' => 'approved-quotations',
                'title' => 'Approved Quotations',
                'value' => (string) $approvedQuotations,
                'percentage' => null,
                'trend' => 'up',
                'icon' => 'ticket',
                'linkHref' => '/photography/quotations',
            ],
            [
                'id' => 'open-invoices',
                'title' => 'Open Invoices',
                'value' => (string) ($financeStats['openInvoices'] ?? 0),
                'percentage' => null,
                'trend' => 'down',
                'icon' => 'receipt',
                'linkHref' => '/finance/invoices?status=awaiting_payment',
            ],
        ];

        $todayRevenue = (float) (Invoice::forShop($shopId)
            ->where('status', 'paid')
            ->whereDate('created_at', $today)
            ->sum('total_amount'));

        $stockMovesToday = StockLog::forShop($shopId)->whereDate('date', $today)->count();

        $activeEmployees = Employee::forShop($shopId)->where('status', 'active')->count();

        $whatsappReadyQuotes = Quotation::forShop($shopId)
            ->whereNotNull('customer_phone')
            ->where('customer_phone', '!=', '')
            ->whereIn('status', ['draft', 'awaiting_approval'])
            ->count();

        $sharedStatsRow = [
            [
                'id' => 'today-revenue',
                'title' => 'Today Revenue (paid)',
                'value' => $this->formatLkrCompact($todayRevenue),
                'percentage' => null,
                'trend' => 'up',
                'icon' => 'circle-dollar-sign',
                'linkHref' => '/finance/invoices',
            ],
            [
                'id' => 'stock-moves-today',
                'title' => 'Stock movements today',
                'value' => (string) $stockMovesToday,
                'percentage' => null,
                'trend' => 'up',
                'icon' => 'package',
                'linkHref' => '/inventory/stock',
            ],
            [
                'id' => 'assigned-staff',
                'title' => 'Active staff',
                'value' => (string) $activeEmployees,
                'percentage' => null,
                'trend' => 'up',
                'icon' => 'users',
                'linkHref' => '/employees',
            ],
            [
                'id' => 'whatsapp-ready',
                'title' => 'WhatsApp-ready quotes',
                'value' => (string) $whatsappReadyQuotes,
                'percentage' => null,
                'trend' => 'up',
                'icon' => 'message-circle',
                'linkHref' => '/photography/quotations',
            ],
        ];

        return Inertia::render('Dashboard', [
            'inventoryStats' => [
                'totalProducts' => $totalProducts,
                'totalSKUs' => $totalSKUs,
                'lowStockCount' => $lowStockCount,
                'totalInventory' => $totalInventory,
            ],
            'lowStockProducts' => $lowStockProducts,
            'topProducts' => $topProducts,
            'financeStats' => $financeStats,
            'dailySnapshot' => $dailySnapshot,
            'sharedStatsRow' => $sharedStatsRow,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatLowStockRow(ProductVariant $variant): array
    {
        $stock = (int) ($variant->inventory?->current_stock ?? 0);
        $threshold = (int) ($variant->inventory?->low_stock_threshold ?? 0);
        $bits = array_filter([$variant->size, $variant->grade_type]);
        $variantLabel = $bits !== [] ? implode(' · ', $bits) : '';

        return [
            'id' => $variant->id,
            'name' => $variant->product->name.($variantLabel !== '' ? ' — '.$variantLabel : ''),
            'sku' => $variant->sku ?? '—',
            'current_stock' => $stock,
            'low_stock_threshold' => $threshold,
            'status' => $stock === 0 ? 'Out of Stock' : 'Low Stock',
            'category' => $variant->product->category?->name ?? 'Uncategorised',
        ];
    }

    private function dayOverDayPercent(int $today, int $yesterday): ?int
    {
        if ($yesterday === 0 && $today === 0) {
            return null;
        }
        if ($yesterday === 0) {
            return 100;
        }

        return (int) round((($today - $yesterday) / $yesterday) * 100);
    }

    private function formatLkrCompact(float $amount): string
    {
        if ($amount >= 1_000_000) {
            return 'LKR '.number_format($amount / 1_000_000, 1).'M';
        }
        if ($amount >= 1_000) {
            return 'LKR '.number_format($amount / 1_000, 1).'K';
        }

        return 'LKR '.number_format($amount, 0, '.', ',');
    }
}
