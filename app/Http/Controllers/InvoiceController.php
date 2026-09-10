<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Quotation;
use App\Models\Sale;
use App\Models\User;
use App\Models\ShopSetting;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceService $invoiceService) {}

    // ── Index ─────────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $query = Invoice::forShop($activeShop->id)
            ->withListRelations()
            ->orderByDesc('created_at');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }
        if ($status = $request->get('status')) $query->where('status', $status);
        if ($module = $request->get('module')) $query->where('module', $module);

        if ($year = $request->get('year')) {
            $query->whereYear('created_at', $year);
        }
        if ($month = $request->get('month')) {
            $query->whereMonth('created_at', $month);
        }
        if ($startDate = $request->get('start_date')) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate = $request->get('end_date')) {
            $query->whereDate('created_at', '<=', $endDate);
        }

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
                    'inventory.id as stock_item_id',
                    $priceSelect,
                    DB::raw('COALESCE(inventory.current_stock, 0) as stock'),
                    'categories.name as category_name',
                ])
                ->orderBy('products.name')
                ->orderBy('product_variants.sku')
                ->get()
            : collect();

        return Inertia::render('Finance/Invoices', [
            'invoices'  => $query->paginate(15)->withQueryString(),
            'stats'     => $this->invoiceService->getFinanceStats(),
            'employees' => User::select('id', 'name')->orderBy('name')->get(),
            'filters'   => $request->only(['search', 'status', 'module', 'year', 'month', 'start_date', 'end_date']),
            'products'  => $products,
        ]);
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['items.variant', 'employee:id,name', 'createdBy:id,name', 'refunds.processedBy:id,name']);
        return Inertia::render('Finance/InvoiceShow', [
            'invoice' => $invoice,
            'shopSettings' => [
                ...ShopSetting::all_settings(),
                'shop_logo_url' => ShopSetting::get('shop_logo') ? asset('storage/' . ShopSetting::get('shop_logo')) : null,
            ],
        ]);
    }

    // ── Print ─────────────────────────────────────────────────────────────
    // Returns a plain HTML Blade page. Opens in new tab.
    // Paper size (A4 or 80mm) is read from shop_settings.
    // ALL variables the blade template needs are passed here.
    public function print(Invoice $invoice)
    {
        $invoice->load(['items.variant', 'employee:id,name', 'createdBy:id,name']);

        $s = ShopSetting::all_settings();
        $template = $s['invoice_template'] ?? 'default';

        if (str_starts_with($template, 'arachchi_')) {
            return Inertia::render('Finance/InvoicePrint', [
                'invoice' => $invoice,
                'shopSettings' => [
                    ...$s,
                    'shop_logo_url' => isset($s['shop_logo']) ? asset('storage/' . $s['shop_logo']) : null,
                ],
            ]);
        }

        return view('invoices.print', [
            'invoice'          => $invoice,
            'paperSize'        => $s['invoice_paper_size']   ?? 'A4',
            'shopName'         => $s['shop_name']            ?? 'Photography Shop',
            'shopAddress'      => $s['shop_address']         ?? '',
            'shopPhone'        => $s['shop_phone']           ?? '',
            'shopEmail'        => $s['shop_email']           ?? '',
            'shopLogo'         => $s['shop_logo']            ?? '',
            'invoiceNote'      => $s['invoice_note']         ?? 'Thank you for your business!',
            'termsConditions'  => $s['invoice_terms']        ?? '',   // ← Terms & Conditions from settings
            'paymentInfo'      => $s['invoice_payment_info'] ?? '',   // ← Payment info from settings
        ]);
    }

    // ── Store ─────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name'        => 'required|string|max:255',
            'customer_phone'       => 'nullable|string|max:30',
            'employee_id'          => 'nullable|exists:users,id',
            'module'               => 'required|in:photography,studio,general',
            'status'               => 'sometimes|in:draft,sent,awaiting_payment,paid,partially_paid,refunded,cancelled',
            'notes'                => 'nullable|string',
            'due_date'             => 'nullable|date',
            'advance_payments'     => 'nullable|array',
            'advance_payments.*.title'  => 'required_with:advance_payments|string|max:255',
            'advance_payments.*.amount' => 'required_with:advance_payments|numeric|min:0',
            'items'                => 'required|array|min:1',
            'items.*.description'  => 'required|string|max:255',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.unit_price'   => 'required|numeric|min:0',
            'items.*.discount_pct' => 'nullable|numeric|min:0|max:100',
            'items.*.product_id'   => 'nullable|integer',
            'items.*.product_sku'  => 'nullable|string|max:100',
        ]);

        try {
            $invoice = $this->invoiceService->createInvoice($validated, auth()->id());
            return back()->with('success', "Invoice {$invoice->invoice_number} created successfully.");
        } catch (\Throwable $e) {
            Log::error('Invoice creation failed', ['error' => $e->getMessage()]);
            return back()->with('error', 'Failed to create invoice. Please try again.');
        }
    }

    // ── Update ────────────────────────────────────────────────────────────
    public function update(Request $request, Invoice $invoice)
    {
        if (in_array($invoice->status, ['refunded', 'cancelled'])) {
            return back()->with('error', "Cannot edit a {$invoice->status} invoice.");
        }

        $validated = $request->validate([
            'customer_name'        => 'sometimes|string|max:255',
            'customer_phone'       => 'nullable|string|max:30',
            'employee_id'          => 'nullable|exists:users,id',
            'module'               => 'sometimes|in:photography,studio,general',
            'status'               => 'sometimes|in:draft,sent,awaiting_payment,paid,partially_paid,refunded,cancelled',
            'notes'                => 'nullable|string',
            'due_date'             => 'nullable|date',
            'advance_payments'     => 'nullable|array',
            'advance_payments.*.title'  => 'required_with:advance_payments|string|max:255',
            'advance_payments.*.amount' => 'required_with:advance_payments|numeric|min:0',
            'items'                => 'sometimes|array|min:1',
            'items.*.description'  => 'required_with:items|string|max:255',
            'items.*.quantity'     => 'required_with:items|integer|min:1',
            'items.*.unit_price'   => 'required_with:items|numeric|min:0',
            'items.*.discount_pct' => 'nullable|numeric|min:0|max:100',
            'items.*.product_id'   => 'nullable|integer',
            'items.*.product_sku'  => 'nullable|string|max:100',
        ]);

        try {
            $invoice = $this->invoiceService->updateInvoice($invoice, $validated);
            return back()->with('success', "Invoice {$invoice->invoice_number} updated.");
        } catch (\Throwable $e) {
            return back()->with('error', 'Failed to update invoice.');
        }
    }

    // ── Destroy ───────────────────────────────────────────────────────────
    public function destroy(Invoice $invoice)
    {
        if ($invoice->status === 'paid')      return back()->with('error', 'Paid invoices cannot be deleted. Issue a refund instead.');
        if ($invoice->status === 'cancelled') return back()->with('error', 'This invoice is already cancelled.');
        $number = $invoice->invoice_number;
        $this->invoiceService->cancelInvoice($invoice);
        return back()->with('success', "Invoice {$number} cancelled successfully.");
    }

    // ── Convert Quotation → Invoice ───────────────────────────────────────
    public function convertFromQuotation(Request $request, Quotation $quotation)
    {
        $validated = $request->validate([
            'employee_id' => 'nullable|exists:users,id',
            'tax_rate'    => 'nullable|numeric|min:0|max:100',
        ]);
        $existing = Invoice::where('quotation_id', $quotation->id)->first();
        if ($existing) return redirect()->route('finance.invoices.show', $existing->id)->with('info', "Invoice {$existing->invoice_number} already exists for this quotation.");
        try {
            $invoice = $this->invoiceService->createFromQuotation(
                quotation: $quotation, employeeId: $validated['employee_id'] ?? auth()->id(),
                createdBy: auth()->id(), taxRate: $validated['tax_rate'] ?? 0,
            );
            return redirect()->route('finance.invoices.show', $invoice->id)
                ->with('success', "Invoice {$invoice->invoice_number} created from quotation {$quotation->quote_number}.");
        } catch (\Throwable $e) {
            Log::error('Quotation→Invoice failed', ['quotation_id' => $quotation->id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Conversion failed. Please try again.');
        }
    }

    // ── Convert POS Sale → Invoice ────────────────────────────────────────
    public function convertFromSale(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'employee_id'   => 'nullable|exists:users,id',
            'customer_name' => 'nullable|string|max:255',
            'module'        => 'nullable|in:photography,studio,general',
        ]);
        try {
            $invoice = $this->invoiceService->createFromSale(
                sale: $sale, employeeId: $validated['employee_id'] ?? null,
                createdBy: auth()->id(), module: $validated['module'] ?? 'studio',
                customerName: $validated['customer_name'] ?? null,
            );
            return back()->with('success', "Invoice {$invoice->invoice_number} generated from sale {$sale->sale_number}.");
        } catch (\Throwable $e) {
            return back()->with('error', 'Conversion failed. Please try again.');
        }
    }

    public function refund(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
        ]);

        try {
            $this->invoiceService->processInvoiceRefund(
                invoice: $invoice,
                amount: (float) $validated['amount'],
                reason: $validated['reason'],
                processedBy: auth()->id()
            );

            return back()->with('success', 'Refund processed successfully.');
        } catch (\Throwable $e) {
            Log::error('Invoice refund failed', ['invoice_id' => $invoice->id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Failed to process refund: ' . $e->getMessage());
        }
    }
}