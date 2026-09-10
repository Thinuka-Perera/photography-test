<?php

namespace App\Http\Controllers\Studio;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BillCategory;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\InvoiceSetting;
use App\Models\ShopSetting;
use App\Modules\Shops\Models\Shop;
use App\Services\BillService;
use App\Services\ShopReceiptProfile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(private BillService $billService) {}

    public function index(): Response
    {
        $authUser = request()->user();
        $activeShop = app(Shop::class);

        // POS now follows the variant-based architecture:
        // product (display info) -> product_variants (sellable unit) -> inventory (stock)
        $hasProductTables = Schema::hasTable('products')
            && Schema::hasTable('product_variants')
            && Schema::hasTable('inventory');

        $variantPriceColumn = null;
        if ($hasProductTables) {
            if (Schema::hasColumn('product_variants', 'selling_price')) {
                $variantPriceColumn = 'product_variants.selling_price';
            } elseif (Schema::hasColumn('product_variants', 'price')) {
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
                    'product_variants.sku',
                    'product_variants.barcode',
                    'product_variants.size as size',
                    'inventory.id as stock_item_id',
                    $priceSelect,
                    DB::raw('COALESCE(inventory.current_stock, 0) as stock'),
                    'products.image',
                    'categories.name as category_name',
                    'categories.id as category_id',
                    'products.uom as uom',
                ])
                ->orderBy('products.name')
                ->orderBy('product_variants.sku')
                ->get()
                ->map(function ($product) {
                    $product->image = $product->image ? \Illuminate\Support\Facades\Storage::disk('public')->url($product->image) : null;
                    return $product;
                })
            : collect();

        $packages = Schema::hasTable('photography_packages')
            ? \App\Models\PhotographyPackage::forShop($activeShop->id)
                ->where('status', 'active')
                ->orderBy('name')
                ->get()
            : collect();

        $categories = Schema::hasTable('categories')
            ? DB::table('categories')
                ->where('shop_id', $activeShop->id)
                ->select(['id', 'name'])
                ->orderBy('name')
                ->get()
            : collect();

        $itemTypes = Schema::hasTable('bill_categories')
            ? (function () use ($activeShop) {
                $query = BillCategory::query()->orderBy('name');

                if (Schema::hasColumn('bill_categories', 'shop_id')) {
                    $query->where('shop_id', $activeShop->id);
                }

                if (Schema::hasColumn('bill_categories', 'is_active')) {
                    $query->where('is_active', true);
                }

                return $query->get([
                    'id',
                    'name',
                    'default_description',
                    'no_commission',
                ]);
            })()
            : collect();

        $editors = Schema::hasTable('employees')
            ? Employee::query()
                ->forShop($activeShop->id)
                ->editors()
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'default_commission_pct', 'job_role'])
            : collect();

        $dealers = Schema::hasTable('employees')
            ? Employee::query()
                ->forShop($activeShop->id)
                ->dealers()
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'default_commission_pct', 'job_role'])
            : collect();

        $frontOfficers = Schema::hasTable('employees')
            ? Employee::query()
                ->forShop($activeShop->id)
                ->where(function ($query) {
                    $query->where('job_role', 'front_office')
                        ->orWhere('job_role', 'front_officer')
                        ->orWhere('role', 'front_officer');
                })
                ->orderBy('name', 'asc')
                ->get(['id', 'name'])
            : collect();

        $recentBills = Schema::hasTable('bills')
            ? Bill::forShop($activeShop->id)
                ->with(['items'])
                ->latest('id')
                ->limit(50)
                ->get([
                    'id', 'bill_number', 'paid_amount', 'after_discount',
                    'balance_due', 'created_at', 'customer_id',
                    'customer_name', 'customer_phone', 'creation_charge',
                    'discount_amount', 'editor_id', 'commission_pct', 'advance_paid',
                ])
            : collect();

        $customers = Schema::hasTable('customers')
            ? Customer::forShop($activeShop->id)
                ->orderBy('name', 'asc')
                ->limit(500)
                ->get(['id', 'name', 'phone', 'email', 'customer_type'])
            : collect();

        $manualInvoices = Schema::hasTable('invoices')
            ? \App\Models\Invoice::forShop($activeShop->id)
                ->whereNull('sale_id')
                ->whereIn('status', ['draft', 'sent', 'awaiting_payment', 'partially_paid'])
                ->with(['items'])
                ->latest()
                ->get()
            : collect();

        $flashedSavedBill = $this->resolveFlashedSavedBill($activeShop->id);

        return Inertia::render('Studio/POS/Index', [
            'products' => $products,
            'categories' => $categories,
            'packages' => $packages,
            'itemTypes' => $itemTypes,
            'editors' => $editors,
            'dealers' => $dealers,
            'frontOfficers' => $frontOfficers,
            'recentBills' => $recentBills,
            'customers' => $customers,
            'manualInvoices' => $manualInvoices,
            'nextBillNo' => $this->billService->generateNextBillNumber(),
            'invoiceSettings' => InvoiceSetting::getSettings(),
            'shopInfo' => ShopReceiptProfile::asShopInfo($activeShop),
            'cashier' => [
                'id' => $authUser?->getAuthIdentifier(),
                'name' => $authUser?->name ?? 'Unknown',
            ],
            'taxRate' => config('pos.tax_rate', 0),
            'canSetCommission' => $authUser?->hasAnyRole(['admin', 'super_admin']) ?? false,
            'flashedSavedBill' => $flashedSavedBill,
        ]);
    }

    /**
     * Load a bill after save — URL query first (cPanel-safe), then session flash id.
     */
    private function resolveFlashedSavedBill(int $shopId): ?array
    {
        if (! Schema::hasTable('bills')) {
            return null;
        }

        $billId = (int) request()->query('saved_bill', 0);
        if ($billId <= 0) {
            $billId = (int) session()->pull('saved_bill_id', 0);
        } else {
            session()->forget('saved_bill_id');
        }

        if ($billId <= 0) {
            return null;
        }

        $bill = Bill::query()
            ->forShop($shopId)
            ->with(['items.category', 'items.stockItem.variant.product.category', 'createdBy', 'editor', 'commission'])
            ->find($billId);

        return $bill?->toArray();
    }
}
