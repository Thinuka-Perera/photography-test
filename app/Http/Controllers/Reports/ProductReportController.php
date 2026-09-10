<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductReportController extends Controller
{
    /**
     * Display product sales and stock report.
     */
    public function index(Request $request): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $activeShopId = $activeShop->id;

        // Default to beginning of current month to today
        $startDate = $request->input('start_date', Carbon::today()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', Carbon::today()->toDateString());
        $categoryId = $request->input('category_id');

        // Subquery to calculate sales within the range
        $salesSubquery = DB::table('bill_items')
            ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
            ->where('bills.shop_id', $activeShopId)
            ->where('bills.status', '!=', 'cancelled')
            ->whereBetween('bills.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->select('stock_item_id')
            ->selectRaw('SUM(quantity) as units_sold')
            ->selectRaw('SUM(line_total) as revenue')
            ->groupBy('stock_item_id');

        // Subquery to calculate product returns within the range based on original sale date
        $returnsSubquery = DB::table('product_return_items')
            ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
            ->leftJoin('bills', 'product_returns.sale_id', '=', 'bills.id')
            ->leftJoin('invoices', 'product_returns.invoice_id', '=', 'invoices.id')
            ->where('product_returns.shop_id', $activeShopId)
            ->where('product_returns.status', 'completed')
            ->whereBetween(DB::raw('COALESCE(bills.created_at, invoices.created_at, product_returns.created_at)'), [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->select('product_return_items.product_id')
            ->selectRaw('SUM(product_return_items.quantity) as returned_qty')
            ->selectRaw('SUM(product_return_items.line_total) as returned_revenue')
            ->groupBy('product_return_items.product_id');

        // Fetch variants with stock, parent details, category, and sales log
        $products = DB::table('product_variants')
            ->join('products', 'product_variants.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('inventory', function ($join) use ($activeShopId) {
                $join->on('inventory.variant_id', '=', 'product_variants.id')
                    ->where('inventory.shop_id', '=', $activeShopId);
            })
            ->leftJoinSub($salesSubquery, 'sales', 'sales.stock_item_id', '=', 'inventory.id')
            ->leftJoinSub($returnsSubquery, 'returns', 'returns.product_id', '=', 'product_variants.id')
            ->where('products.shop_id', $activeShopId)
            ->when($categoryId, function ($q) use ($categoryId) {
                return $q->where('products.category_id', $categoryId);
            })
            ->select([
                'product_variants.id',
                'products.name as product_name',
                'product_variants.sku',
                'product_variants.barcode',
                'product_variants.cost_price',
                'product_variants.selling_price',
                'categories.name as category_name',
                DB::raw('COALESCE(inventory.current_stock, 0) as current_stock'),
                DB::raw('CAST(COALESCE(sales.units_sold, 0) - COALESCE(returns.returned_qty, 0) AS INTEGER) as units_sold'),
                DB::raw('COALESCE(sales.revenue, 0) - COALESCE(returns.returned_revenue, 0) as revenue'),
            ])
            ->orderBy('products.name')
            ->orderBy('product_variants.sku')
            ->get();

        // Calculate Overview Statistics
        $totalVariants = $products->count();
        $totalStockUnits = $products->sum('current_stock');
        $totalStockValueRetail = $products->sum(fn($p) => $p->current_stock * $p->selling_price);
        $totalStockValueCost = $products->sum(fn($p) => $p->current_stock * $p->cost_price);
        $totalUnitsSold = $products->sum('units_sold');
        $totalRevenue = $products->sum('revenue');

        $categories = DB::table('categories')
            ->where('shop_id', $activeShopId)
            ->orderBy('name')
            ->get();

        return Inertia::render('Reports/ProductReports', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'category_id' => $categoryId,
            ],
            'products' => $products,
            'categories' => $categories,
            'canViewEstimatedProfit' => $request->user()->canAccessPage('product-reports-estimated-profit'),
            'stats' => [
                'total_variants' => $totalVariants,
                'total_stock_units' => $totalStockUnits,
                'total_stock_value_retail' => $totalStockValueRetail,
                'total_stock_value_cost' => $totalStockValueCost,
                'total_units_sold' => $totalUnitsSold,
                'total_revenue' => $totalRevenue,
            ],
        ]);
    }
}
