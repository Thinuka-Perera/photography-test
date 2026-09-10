<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

use App\Models\Expense;
use App\Models\ProductReturn;

class SaleReportController extends Controller
{
    /**
     * Daily sales report page.
     * 
     * Uses the Bill model (POS system), not the legacy Sale model.
     */
    public function daily(Request $request): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        
        $startDateStr = $request->start_date ?: $request->date;
        $endDateStr = $request->end_date ?: $startDateStr;

        if (!$startDateStr) {
            $startDateStr = Carbon::today()->toDateString();
            $endDateStr = Carbon::today()->toDateString();
        }

        $startDate = Carbon::parse($startDateStr)->startOfDay();
        $endDate = Carbon::parse($endDateStr)->endOfDay();

        // Main summary — all valid sales created in range (cash, card, bank, credit, advance)
        $summary = Bill::forShop($activeShop->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'reclaimed')
            ->selectRaw('
                COUNT(*)                     as total_transactions,
                SUM(after_discount)          as gross_revenue,
                SUM(discount_amount)         as total_discounts,
                0                            as total_tax,
                0                            as total_commission,
                AVG(after_discount)          as avg_sale_value,
                MAX(after_discount)          as highest_sale,
                MIN(after_discount)          as lowest_sale
            ')
            ->first();

        // Fetch metrics safely from Bill query (Accrual basis for Revenue/Profit)
        if ($summary) {
            $summary->total_transactions = (int) ($summary->total_transactions ?? 0);
            $summary->total_commission = (float) ($summary->total_commission ?? 0);
            $summary->total_tax = 0.0;
            $summary->gross_revenue = (float) ($summary->gross_revenue ?? 0);
            $summary->total_discounts = (float) ($summary->total_discounts ?? 0);
            $summary->avg_sale_value = (float) ($summary->avg_sale_value ?? 0);
            $summary->highest_sale = (float) ($summary->highest_sale ?? 0);
            $summary->lowest_sale = (float) ($summary->lowest_sale ?? 0);
        }

        // Payment method breakdown (Cash flow basis: Today's initial payments + Today's credit settlements)
        
        // 1. Initial Payments collected on bills created today
        $initialPayments = collect(DB::table('bills')
            ->where('shop_id', $activeShop->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'delivered')
            ->selectRaw('
                CASE 
                    WHEN payment_method IN ("credit", "advance") THEN COALESCE(advance_payment_method, "cash") 
                    ELSE payment_method 
                END as method,
                COUNT(*) as count,
                SUM(CASE 
                    WHEN payment_method IN ("credit", "advance") THEN COALESCE(advance_paid, 0) 
                    ELSE paid_amount 
                END) as total
            ')
            ->groupBy('method')
            ->get());

        // 2. Credit Settlements collected today
        $creditSettlements = collect();
        if (\Illuminate\Support\Facades\Schema::hasTable('credit_payments')) {
            $creditSettlements = collect(DB::table('credit_payments')
                ->join('credit_bills', 'credit_payments.credit_bill_id', '=', 'credit_bills.id')
                ->where('credit_bills.shop_id', $activeShop->id)
                ->whereBetween('credit_payments.created_at', [$startDate, $endDate])
                ->selectRaw('
                    credit_payments.payment_method as method,
                    COUNT(*) as count,
                    SUM(credit_payments.amount) as total
                ')
                ->groupBy('credit_payments.payment_method')
                ->get());
        }

        // Combine into one unified breakdown
        $paymentBreakdown = collect();
        $methods = $initialPayments->concat($creditSettlements)->groupBy('method');
        foreach ($methods as $method => $items) {
            $paymentBreakdown->push((object)[
                'method' => $method,
                'count' => $items->sum('count'),
                'total' => $items->sum('total'),
            ]);
        }

        $totalReturned = (float) DB::table('product_returns')
            ->where('product_returns.shop_id', $activeShop->id)
            ->where('product_returns.status', 'completed')
            ->whereBetween('product_returns.created_at', [$startDate, $endDate])
            ->sum('product_returns.total_amount');

        $totalReturnedCost = (float) DB::table('product_return_items')
            ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
            ->leftJoin('product_variants', 'product_return_items.product_id', '=', 'product_variants.id')
            ->where('product_returns.shop_id', $activeShop->id)
            ->where('product_returns.status', 'completed')
            ->whereBetween('product_returns.created_at', [$startDate, $endDate])
            ->sum(DB::raw('product_return_items.quantity * COALESCE(product_variants.cost_price, 0)'));

        $totalItemCost = DB::table('bill_items')
            ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
            ->leftJoin('inventory', 'bill_items.stock_item_id', '=', 'inventory.id')
            ->leftJoin('product_variants', 'inventory.variant_id', '=', 'product_variants.id')
            ->where('bills.shop_id', $activeShop->id)
            ->whereBetween('bills.created_at', [$startDate, $endDate])
            ->where('bills.status', '!=', 'reclaimed')
            ->sum(DB::raw('bill_items.quantity * COALESCE(bill_items.cost, product_variants.cost_price, 0)'));

        $totalItemCost = max(0.00, (float) $totalItemCost - $totalReturnedCost);

        $totalCollection = max(0.00, (float) ($paymentBreakdown->sum('total') - $totalReturned));

        // Fix total commission: Sum from editor_commissions table
        $totalCommission = DB::table('editor_commissions')
            ->where('shop_id', $activeShop->id)
            ->whereBetween('commission_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->sum('commission_amt');

        if ($summary) {
            $summary->total_commission = (float) $totalCommission;
            $summary->total_collection = $totalCollection;
        }

        // Refunds or balance due (outstanding)
        $refundSummary = Bill::forShop($activeShop->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('
                COUNT(CASE WHEN balance_due > 0 THEN 1 END) as total_refunds,
                0.00 as total_refunded
            ')
            ->first();

        // Hourly breakdown — for chart on React side
        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            $hourlyBreakdown = Bill::forShop($activeShop->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->where('status', '!=', 'reclaimed')
                ->selectRaw("CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count, SUM(after_discount) as revenue")
                ->groupBy(DB::raw("strftime('%H', created_at)"))
                ->orderBy('hour')
                ->get();
        } else {
            $hourlyBreakdown = Bill::forShop($activeShop->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->where('status', '!=', 'reclaimed')
                ->selectRaw('HOUR(created_at) as hour, COUNT(*) as count, SUM(after_discount) as revenue')
                ->groupBy(DB::raw('HOUR(created_at)'))
                ->orderBy('hour')
                ->get();
        }

        // Products sold in range with total qty, revenue, and profit
        $productsSold = DB::table('bill_items')
            ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
            ->leftJoin('inventory', 'bill_items.stock_item_id', '=', 'inventory.id')
            ->leftJoin('product_variants', 'inventory.variant_id', '=', 'product_variants.id')
            ->leftJoin('products', 'product_variants.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('bill_categories', 'bill_items.category_id', '=', 'bill_categories.id')
            ->where('bills.shop_id', $activeShop->id)
            ->whereBetween('bills.created_at', [$startDate, $endDate])
            ->where('bills.status', '!=', 'reclaimed')
            ->selectRaw('
                COALESCE(bill_items.stock_item_id, bill_items.id) as product_id,
                bill_items.description as product_name,
                COALESCE(bill_categories.name, categories.name) as category_name,
                SUM(bill_items.quantity)   as total_qty,
                SUM(bill_items.line_total) as total_revenue,
                SUM(bill_items.line_total) - SUM(bill_items.quantity * COALESCE(bill_items.cost, product_variants.cost_price, 0)) as total_profit
            ')
            ->groupBy(
                DB::raw('COALESCE(bill_items.stock_item_id, bill_items.id)'),
                'bill_items.description',
                'bill_categories.name',
                'categories.name'
            )
            ->orderByDesc('total_revenue')
            ->get();

        // Fetch Daily Expenses
        $expenses = Expense::where('shop_id', $activeShop->id)
            ->whereBetween('expense_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->with('creator')
            ->orderBy('expense_date', 'desc')
            ->get()
            ->map(function ($exp) {
                return [
                    'id' => $exp->id,
                    'category' => $exp->category,
                    'description' => $exp->description,
                    'amount' => (float) $exp->amount,
                    'expense_date' => $exp->expense_date->toDateString(),
                    'created_by' => $exp->creator ? $exp->creator->name : 'N/A',
                ];
            });

        $totalDailyExpenses = $expenses->sum('amount');

        return Inertia::render('Reports/DailySales', [
            'startDate' => $startDate->toDateString(),
            'endDate' => $endDate->toDateString(),
            'date' => $startDate->toDateString(), // Compatibility fallback
            'summary' => $summary,
            'paymentBreakdown' => $paymentBreakdown,
            'refundSummary' => $refundSummary,
            'hourlyBreakdown' => $hourlyBreakdown,
            'productsSold' => $productsSold,
            'expenses' => $expenses,
            'totalDailyExpenses' => $totalDailyExpenses,
            'totalItemCost' => (float) $totalItemCost,
            'totalReturned' => $totalReturned,
            'totalCollection' => $totalCollection,
            'canViewNetProfit' => $request->user()->canAccessPage('daily-sales-report-net-profit'),
            'canManageExpenses' => $request->user()->canAccessPage('daily-sales-report-expenses'),
        ]);
    }

    /**
     * Store new daily expense request.
     */
    public function storeExpense(Request $request)
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $request->validate([
            'category' => 'required|string|in:Raw Materials,Electricity Bill,Water Bill,Rent,Transport,Salaries,Other',
            'description' => 'nullable|string|max:500',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
        ]);

        Expense::create([
            'shop_id' => $activeShop->id,
            'category' => $request->category,
            'description' => $request->description,
            'amount' => $request->amount,
            'expense_date' => $request->expense_date,
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Expense recorded successfully.');
    }

    /**
     * Update an existing daily expense.
     */
    public function updateExpense(Request $request, Expense $expense)
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        if ($expense->shop_id !== $activeShop->id) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'category' => 'required|string|in:Raw Materials,Electricity Bill,Water Bill,Rent,Transport,Salaries,Other',
            'description' => 'nullable|string|max:500',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
        ]);

        $expense->update([
            'category' => $request->category,
            'description' => $request->description,
            'amount' => $request->amount,
            'expense_date' => $request->expense_date,
        ]);

        return back()->with('success', 'Expense updated successfully.');
    }

    /**
     * Delete an existing daily expense.
     */
    public function destroyExpense(Expense $expense)
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        if ($expense->shop_id !== $activeShop->id) {
            abort(403, 'Unauthorized action.');
        }

        $expense->delete();

        return back()->with('success', 'Expense deleted successfully.');
    }
}
