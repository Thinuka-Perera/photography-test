<?php

namespace App\Http\Controllers\Reports;

use App\Models\BillItem;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomEntryReportController extends Controller
{
    /**
     * Display custom/manual entries report page.
     */
    public function index(Request $request): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $activeShopId = $activeShop->id;

        // Default: start of current month to today
        $startDateStr = $request->input('start_date', Carbon::today()->startOfMonth()->toDateString());
        $endDateStr = $request->input('end_date', Carbon::today()->toDateString());
        $categoryId = $request->input('category_id');

        $startDate = Carbon::parse($startDateStr)->startOfDay();
        $endDate = Carbon::parse($endDateStr)->endOfDay();

        // 1. Fetch custom entries (bill items where is_stock_item = false/0)
        $query = DB::table('bill_items')
            ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
            ->leftJoin('bill_categories', 'bill_items.category_id', '=', 'bill_categories.id')
            ->where('bills.shop_id', $activeShopId)
            ->where('bill_items.is_stock_item', false)
            ->whereBetween('bills.created_at', [$startDate, $endDate])
            ->where('bills.status', 'delivered');

        // Apply category filter if provided
        if ($categoryId) {
            $query->where('bill_items.category_id', $categoryId);
        }

        $items = $query->select([
                'bill_items.id',
                'bills.bill_number',
                'bills.created_at as sale_date',
                'bill_categories.name as category_name',
                'bill_items.description',
                'bill_items.quantity',
                'bill_items.unit_price',
                'bill_items.cost',
                'bill_items.discount_amount',
                'bill_items.line_total as total_revenue',
            ])
            ->orderBy('bills.created_at', 'desc')
            ->get()
            ->map(function ($item) {
                $cost = $item->cost !== null ? (float) $item->cost : null;
                $quantity = (float) $item->quantity;
                $total_revenue = (float) $item->total_revenue;
                // If cost is null (not entered), fallback to 0 cost, which results in profit = total_revenue
                $profit = $cost !== null ? ($total_revenue - ($cost * $quantity)) : $total_revenue;

                return [
                    'id' => $item->id,
                    'bill_number' => $item->bill_number,
                    'sale_date' => Carbon::parse($item->sale_date)->toDateTimeString(),
                    'category_name' => $item->category_name ?? '—',
                    'description' => $item->description ?? '—',
                    'quantity' => $quantity,
                    'unit_price' => (float) $item->unit_price,
                    'cost' => $cost,
                    'profit' => (float) $profit,
                    'discount_amount' => (float) $item->discount_amount,
                    'total_revenue' => $total_revenue,
                ];
            });

        // 2. Overview Statistics
        $totalTransactions = $items->unique('bill_number')->count();
        $totalItemsSold = $items->sum('quantity');
        $totalRevenue = $items->sum('total_revenue');
        $totalDiscounts = $items->sum('discount_amount');
        $totalProfit = $items->sum('profit');

        // 3. Fetch Category choices for custom entries / manual rows
        $categories = DB::table('bill_categories')
            ->where('shop_id', $activeShopId)
            ->orderBy('name')
            ->get();

        return Inertia::render('Reports/CustomEntryReports', [
            'filters' => [
                'start_date' => $startDateStr,
                'end_date' => $endDateStr,
                'category_id' => $categoryId,
            ],
            'items' => $items,
            'categories' => $categories,
            'stats' => [
                'total_transactions' => $totalTransactions,
                'total_items_sold' => $totalItemsSold,
                'total_revenue' => $totalRevenue,
                'total_discounts' => $totalDiscounts,
                'total_profit' => $totalProfit,
            ],
        ]);
    }

    /**
     * Update/add cost for a custom entry bill item.
     */
    public function updateCost(Request $request, BillItem $billItem)
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);

        // Ensure this bill item belongs to a bill in the active shop
        if ($billItem->bill->shop_id !== $activeShop->id) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'cost' => 'nullable|numeric|min:0',
        ]);

        $billItem->update([
            'cost' => $request->cost !== null ? $request->cost : null,
        ]);

        return back()->with('success', 'Cost updated successfully.');
    }
}
