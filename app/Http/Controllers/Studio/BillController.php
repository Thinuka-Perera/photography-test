<?php

namespace App\Http\Controllers\Studio;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BillCategory;
use App\Models\CreditBill;
use App\Models\Employee;
use App\Models\InvoiceSetting;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\ShopSetting;
use App\Modules\Shops\Models\Shop;
use App\Services\BillService;
use App\Services\CreditBillService;
use App\Services\ShopReceiptProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BillController extends Controller
{
    public function __construct(private BillService $billService) {}

    /**
     * Show bill listing page.
     */
    public function index(Request $request)
    {
        $activeShop = app(Shop::class);
        $query = Bill::forShop($activeShop->id);

        // Filter by status
        if ($request->get('status')) {
            $query->where('status', $request->get('status'));
        }

        // Filter by date range
        if ($request->get('from_date') && $request->get('to_date')) {
            $query->byDateRange($request->get('from_date'), $request->get('to_date'));
        }

        // Filter by editor
        if ($request->get('editor_id')) {
            $query->byEditor($request->get('editor_id'));
        }

        // Filter by dealer
        if ($request->get('dealer_id')) {
            $query->where('dealer_id', $request->get('dealer_id'));
        }

        $bills = $query->with(['createdBy', 'editor', 'commission', 'dealer', 'dealerCommission'])
            ->latest('created_at')
            ->paginate(20);

        $editors = Employee::query()
            ->forShop($activeShop->id)
            ->editors()
            ->orderBy('name', 'asc')
            ->get(['id', 'name']);

        $dealers = Employee::query()
            ->forShop($activeShop->id)
            ->dealers()
            ->orderBy('name', 'asc')
            ->get(['id', 'name']);

        return Inertia::render('Studio/Bills/Index', [
            'bills' => $bills,
            'filters' => $request->only(['status', 'from_date', 'to_date', 'editor_id', 'dealer_id']),
            'editors' => $editors,
            'dealers' => $dealers,
        ]);
    }

    /**
     * Show bill creation form.
     */
    public function create()
    {
        $activeShop = app(Shop::class);

        return Inertia::render('Studio/Bills/Create', [
            'itemTypes' => BillCategory::query()->where('is_active', true)->get(['id', 'name', 'default_description', 'no_commission']),
            'categories' => BillCategory::query()->where('is_active', true)->get(['id', 'name', 'default_description', 'no_commission']),
            'editors' => Employee::query()
                ->forShop($activeShop->id)
                ->editors()
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'default_commission_pct']),
            'dealers' => Employee::query()
                ->forShop($activeShop->id)
                ->dealers()
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'default_commission_pct']),
        ]);
    }

    /**
     * Store a new bill.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.category_id' => 'nullable|exists:bill_categories,id',
            'items.*.is_stock_item' => 'boolean',
            'items.*.stock_item_id' => 'nullable|exists:inventory,id',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_type' => 'nullable|string|in:amount,percent',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'editor_id' => 'nullable|exists:employees,id',
            'commission_pct' => 'nullable|numeric|min:0|max:100',
            'is_commission_applicable' => 'boolean',
            'dealer_id' => 'nullable|exists:employees,id',
            'dealer_commission_pct' => 'nullable|numeric|min:0|max:100',
            'is_dealer_commission_applicable' => 'boolean',
            'payment_method' => 'required|string|in:cash,card,bank_transfer,credit,advance',
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'required_if:payment_method,credit,advance|nullable|string|max:255',
            'customer_phone' => 'required_if:payment_method,credit,advance|nullable|string|max:20',
            'reference_number' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'front_officer_id' => 'nullable|exists:employees,id',
            'promise_date' => 'nullable|date',
            'advance_ref_bill_id' => 'nullable|exists:bills,id',
            'advance_paid' => 'nullable|numeric|min:0',
            'advance_payment_method' => 'required_if:payment_method,advance|nullable|string|in:cash,card,bank_transfer',
            'paid_amount' => 'required|numeric|min:0',
            'creation_charge' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'creation_charge_items' => 'nullable|array',
            'creation_charge_items.*.label' => 'required|string|max:255',
            'creation_charge_items.*.amount' => 'required|numeric|min:0',
            'creation_charge_items.*.editor_id' => 'nullable|exists:employees,id',
            'creation_charge_items.*.dealer_id' => 'nullable|exists:employees,id',
            'dealer_commission_items' => 'nullable|array',
            'dealer_commission_items.*.label' => 'required|string|max:255',
            'dealer_commission_items.*.amount' => 'required|numeric|min:0',
            'dealer_commission_items.*.dealer_id' => 'nullable|exists:employees,id',
            'invoice_id' => 'nullable|exists:invoices,id',
        ]);

        if (in_array($validated['payment_method'], ['credit', 'advance']) && empty($validated['advance_ref_bill_id'])) {
            $request->validate([
                'front_officer_id' => 'required|exists:employees,id',
                'promise_date' => 'required|date|after_or_equal:today',
            ]);
        }

        try {
            $bill = null;
            $isIntercepted = false;
            DB::transaction(function () use (&$bill, &$validated, &$isIntercepted, $request) {
                // If it's a Credit bill, intercept the request and treat it as a payment against the old bill
                if (!empty($validated['advance_ref_bill_id'])) {
                    $oldBill = Bill::find($validated['advance_ref_bill_id']);
                    if ($oldBill && $oldBill->balance_due > 0) {
                        
                        // Check if items were modified
                        $subtotal = 0;
                        foreach ($validated['items'] as $item) {
                            $qty = (float) ($item['quantity'] ?? 1);
                            $price = (float) ($item['unit_price'] ?? 0);
                            $discType = $item['discount_type'] ?? 'amount';
                            $discVal = (float) ($item['discount_value'] ?? 0);
                            
                            $lineRaw = $qty * $price;
                            $lineDisc = $discType === 'percent' ? ($lineRaw * $discVal / 100) : $discVal;
                            $subtotal += ($lineRaw - min($lineDisc, $lineRaw));
                        }
                        $requestAfterDiscount = max(0, $subtotal - (float) ($validated['discount_amount'] ?? 0));
                        
                        if (abs($requestAfterDiscount - $oldBill->after_discount) > 1.0) {
                            throw \Illuminate\Validation\ValidationException::withMessages([
                                'advance_ref_bill_id' => 'You cannot modify items while paying an installment. To pay an installment, do not modify the copied items, or use the "Pay Balance" feature in Sales History.'
                            ]);
                        }

                        $paymentAmount = (float) $validated['paid_amount'];
                        
                        if ($paymentAmount > 0) {
                            $creditBill = \App\Models\CreditBill::where('bill_id', $oldBill->id)->first();
                            if ($creditBill) {
                                $creditBillService = app(\App\Services\CreditBillService::class);
                                $creditBillService->recordPayment($creditBill, [
                                    'amount' => $paymentAmount,
                                    'payment_method' => 'cash',
                                    'reference_number' => $validated['reference_number'] ?? null,
                                    'bank_name' => $validated['bank_name'] ?? null,
                                    'front_officer_id' => $validated['front_officer_id'] ?? \App\Models\Employee::resolveForUser($request->user(), app(Shop::class)->id),
                                ]);
                            }
                        }
                        
                        $bill = $oldBill->fresh();
                        $isIntercepted = true;
                        return; // exit the transaction closure to prevent new bill creation
                    }
                }

                $editorCommissionPct = null;
                if (! empty($validated['editor_id'])) {
                    $editorCommissionPct = Employee::query()
                        ->forShop(app(Shop::class)->id)
                        ->whereKey($validated['editor_id'])
                        ->value('default_commission_pct');
                }

                $dealerCommissionPct = null;
                if (! empty($validated['dealer_id'])) {
                    $dealerCommissionPct = Employee::query()
                        ->forShop(app(Shop::class)->id)
                        ->whereKey($validated['dealer_id'])
                        ->value('default_commission_pct');
                }

                $status = 'processing';
                $isPosCommit = $request->routeIs('studio.pos.commit') || $request->header('X-POS-Commit') === '1';
                if ($isPosCommit && in_array($validated['payment_method'], ['cash', 'card', 'bank_transfer'], true)) {
                    $status = 'delivered';
                }

                $employeeId = Employee::resolveForUser($request->user(), app(Shop::class)->id);
                if (! $employeeId) {
                    throw ValidationException::withMessages([
                        'created_by' => ['No employee record found for the current cashier.'],
                    ]);
                }

                $items = array_map(function ($item) {
                    if (empty($item['description'])) {
                        $categoryName = null;
                        if (! empty($item['category_id'])) {
                            $categoryName = \App\Models\BillCategory::where('id', $item['category_id'])->value('name');
                        }
                        $item['description'] = $categoryName ?: 'Item';
                    }
                    return $item;
                }, $validated['items']);

                $canManageCommissions = $request->user()?->canAccessPage('studio-pos-commission') ?? false;

                $bill = $this->billService->createBill([
                    'status' => $status,
                    'created_by' => $employeeId,
                    'items' => $items,
                    'discount_amount' => $validated['discount_amount'] ?? 0,
                    'editor_id' => $canManageCommissions ? ($validated['editor_id'] ?? null) : null,
                    'commission_pct' => $canManageCommissions
                        ? ($validated['commission_pct'] ?? $editorCommissionPct)
                        : null,
                    'is_commission_applicable' => $canManageCommissions
                        ? ($validated['is_commission_applicable'] ?? true)
                        : false,

                    'dealer_id' => $canManageCommissions ? ($validated['dealer_id'] ?? null) : null,
                    'dealer_commission_pct' => $canManageCommissions
                        ? ($validated['dealer_commission_pct'] ?? $dealerCommissionPct)
                        : null,
                    'is_dealer_commission_applicable' => $canManageCommissions
                        ? ($validated['is_dealer_commission_applicable'] ?? true)
                        : false,

                    'payment_method' => $validated['payment_method'],
                    'customer_id' => $validated['customer_id'] ?? null,
                    'customer_name' => $validated['customer_name'] ?? null,
                    'customer_phone' => $validated['customer_phone'] ?? null,
                    'creation_charge' => $canManageCommissions ? ($validated['creation_charge'] ?? 0) : 0,
                    'creation_charge_items' => $canManageCommissions ? ($validated['creation_charge_items'] ?? null) : null,
                    'dealer_commission_items' => $canManageCommissions ? ($validated['dealer_commission_items'] ?? null) : null,
                    'reference_number' => $validated['reference_number'] ?? null,
                    'bank_name' => $validated['bank_name'] ?? null,
                    'front_officer_id' => $validated['front_officer_id'] ?? null,
                    'advance_ref_bill_id' => $validated['advance_ref_bill_id'] ?? null,
                    'advance_paid' => $validated['advance_paid'] ?? 0,
                    'advance_payment_method' => $validated['advance_payment_method'] ?? null,
                    'paid_amount' => $validated['paid_amount'],
                    'notes' => $validated['notes'] ?? null,
                ]);

                // If payment_method is credit or advance, create CreditBill
                if (in_array($validated['payment_method'], ['credit', 'advance'], true)) {
                    $advancePaidAmount = ($validated['payment_method'] === 'advance') ? ($validated['advance_paid'] ?? 0) : 0;
                    $remainingBalance = $bill->after_discount - $advancePaidAmount;

                    \App\Models\CreditBill::create([
                        'shop_id' => $bill->shop_id,
                        'bill_id' => $bill->id,
                        'type' => $validated['payment_method'],
                        'customer_name' => $validated['customer_name'] ?? null,
                        'customer_phone' => $validated['customer_phone'] ?? null,
                        'total_amount' => $bill->after_discount,
                        'paid_amount' => $advancePaidAmount,
                        'balance_amount' => $remainingBalance,
                        'created_by' => $validated['front_officer_id'] ?? null,
                        'promise_date' => $validated['promise_date'] ?? null,
                        'status' => 'outstanding',
                        'advance_payment_method' => $validated['advance_payment_method'] ?? null,
                    ]);
                }

                // If the bill went straight to delivered status (standard cash/card/bank checkout from POS),
                // create mirrored Sale and Payment records for reporting/collections.
                if ($status === 'delivered') {
                    $sale = Sale::create([
                        'shop_id' => $bill->shop_id ?? app(Shop::class)->id,
                        'sale_number' => 'SALE-'.$bill->bill_number,
                        'customer_id' => $bill->customer_id,
                        'customer_name' => $bill->customer_name,
                        'customer_phone' => $bill->customer_phone,
                        'reference_number' => $bill->reference_number,
                        'bank_name' => $bill->bank_name,
                        'payment_method' => $bill->payment_method,
                        'cashier_id' => $request->user()?->getAuthIdentifier(),
                        'editor_id' => $bill->editor_id,
                        'subtotal' => $bill->subtotal,
                        'discount_amount' => $bill->discount_amount,
                        'total_amount' => $bill->after_discount,
                        'commission_rate' => (float) ($bill->commission_pct ?? 0),
                        'commission_amount' => optional($bill->commission)->commission_amt ?? 0,
                        'status' => 'completed',
                        'completed_at' => now(),
                        'notes' => $bill->notes,
                    ]);

                    // Copy items to sale for detailed reporting
                    foreach ($bill->items as $item) {
                        $qty = (float) $item->quantity;
                        $price = (float) $item->unit_price;
                        $lineDisc = (float) ($item->discount_amount ?? 0);
                        $lineTotal = (float) ($item->line_total ?? ($price * $qty));

                        $discountPct = 0.00;
                        if ($qty > 0 && $price > 0) {
                            if ($item->discount_type === 'percent') {
                                $discountPct = (float) ($item->discount_value ?? 0);
                            } else {
                                $discountPct = round(($lineDisc / ($price * $qty)) * 100, 2);
                            }
                        }

                        $sale->items()->create([
                            'product_name' => $item->description,
                            'unit_price' => $price,
                            'quantity' => $qty,
                            'discount_pct' => $discountPct,
                            'line_discount_amount' => $lineDisc,
                            'line_total' => $lineTotal,
                        ]);
                    }

                    // Create a Payment for the sale
                    $paymentAmount = (float) $bill->after_discount;
                    if ($paymentAmount > 0) {
                        Payment::create([
                            'sale_id' => $sale->id,
                            'method' => $bill->payment_method,
                            'amount' => $paymentAmount,
                            'reference_no' => $bill->reference_number,
                            'gateway' => null,
                            'status' => 'completed',
                            'confirmed_at' => now(),
                        ]);
                    }

                    // Immediately mark dealer commission as paid and add to salary ledger
                    $bill->loadMissing(['dealerCommissions']);
                    foreach ($bill->dealerCommissions as $dComm) {
                        if (!$dComm->is_paid && (float) $dComm->commission_amt > 0) {
                            $this->billService->markDealerCommissionPaid(
                                $dComm,
                                (int) ($request->user()?->getAuthIdentifier() ?? 0)
                            );
                        }
                    }
                }

                // Link to manual invoice if present
                if (!empty($validated['invoice_id'])) {
                    $invoice = \App\Models\Invoice::find($validated['invoice_id']);
                    if ($invoice) {
                        $invoice->update([
                            'status' => 'paid',
                            'sale_id' => isset($sale) ? $sale->id : null,
                        ]);
                        $bill->invoice_number = $invoice->invoice_number;
                    }
                }

                // If the new bill reclaims an advance, deduct the claimed amount or settle the original advance bill
                if (! empty($validated['advance_ref_bill_id'])) {
                    // The claimed amount is what we're applying from the advance to the new bill
                    // Since it's an advance claim, POS sets advance_paid to the total advance, but we only consume up to after_discount
                    $claimedAmount = min(
                        (float) ($validated['advance_paid'] ?? 0),
                        max(0, $bill->after_discount - (float) ($validated['paid_amount'] ?? 0))
                    );

                    $oldBill = Bill::find($validated['advance_ref_bill_id']);
                    if ($oldBill && $oldBill->advance_paid > 0) {
                        $remainingAdvance = max(0, $oldBill->advance_paid - $claimedAmount);
                        
                        $oldBill->update([
                            'advance_paid' => $remainingAdvance,
                            'after_discount' => $remainingAdvance,
                            'subtotal' => $remainingAdvance,
                            'status' => $remainingAdvance <= 0 ? 'reclaimed' : $oldBill->status,
                        ]);
                        
                        $oldItem = $oldBill->items()->first();
                        if ($oldItem) {
                            $oldItem->update([
                                'unit_price' => $remainingAdvance,
                                'line_total' => $remainingAdvance,
                            ]);
                        }

                        $originalCreditBill = CreditBill::where('bill_id', $oldBill->id)->first();
                        if ($originalCreditBill) {
                            $originalCreditBill->update([
                                'total_amount' => $remainingAdvance,
                                'paid_amount' => $remainingAdvance,
                                'status' => $remainingAdvance <= 0 ? 'settled' : $originalCreditBill->status,
                                'settled_date' => $remainingAdvance <= 0 ? today() : $originalCreditBill->settled_date,
                                'settled_by' => $remainingAdvance <= 0 ? Employee::resolveForUser($request->user(), app(Shop::class)->id) : $originalCreditBill->settled_by,
                            ]);
                        }

                        $oldSale = Sale::where('sale_number', 'SALE-'.$oldBill->bill_number)->first();
                        if ($oldSale) {
                            if ($remainingAdvance <= 0) {
                                $oldSale->update(['status' => 'cancelled']);
                            } else {
                                $oldSale->update([
                                    'subtotal' => $remainingAdvance,
                                    'total_amount' => $remainingAdvance,
                                ]);
                                $oldPayment = Payment::where('sale_id', $oldSale->id)->first();
                                if ($oldPayment) {
                                    $oldPayment->update(['amount' => $remainingAdvance]);
                                }
                            }
                        }
                    }
                }
            });

            if (! $bill) {
                throw new \RuntimeException('Bill was not created.');
            }

            $bill->load([
                'items.category',
                'createdBy',
                'editor',
                'commission',
            ]);
            $bill->loadMissing(['items.stockItem.variant.product.category']);
            $successMessage = $isIntercepted 
                ? "Installment payment for {$bill->bill_number} recorded successfully." 
                : "Bill {$bill->bill_number} created successfully.";

            $wantsJson = $request->routeIs('studio.pos.commit')
                || $request->header('X-POS-Commit') === '1'
                || $request->expectsJson();

            // POS commits use JSON so shared-hosting session/redirect issues cannot drop the receipt.
            if ($wantsJson) {
                return response()->json([
                    'success' => true,
                    'message' => $successMessage,
                    'bill_id' => $bill->id,
                    'bill' => $bill->toArray(),
                ]);
            }

            return redirect()->route('studio.pos.index', ['saved_bill' => $bill->id])
                ->with('success', $successMessage)
                ->with('bill_id', $bill->id)
                ->with('bill_number', $bill->bill_number)
                ->with('saved_bill_id', $bill->id);
        } catch (\Throwable $e) {
            $wantsJson = $request->routeIs('studio.pos.commit')
                || $request->header('X-POS-Commit') === '1'
                || $request->expectsJson();

            if ($wantsJson) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create bill: '.$e->getMessage(),
                ], 422);
            }

            return redirect()->back()
                ->with('error', 'Failed to create bill: '.$e->getMessage())
                ->withInput();
        }
    }

    /**
     * JSON payload for POS receipt modal (fallback when session flash fails on shared hosting).
     */
    public function posFlash(Bill $bill)
    {
        $activeShop = app(Shop::class);
        $billExists = Bill::query()
            ->forShop($activeShop?->id)
            ->whereKey($bill->id)
            ->exists();
        abort_unless($billExists, 404);

        $bill->load(['items.category', 'items.stockItem.variant.product.category', 'createdBy', 'editor', 'commission']);

        $sale = $bill->payment_method === 'credit' ? null : \App\Models\Sale::where('sale_number', 'SALE-'.$bill->bill_number)->first();
        if ($sale) {
            $invoice = \App\Models\Invoice::where('sale_id', $sale->id)->first();
            if ($invoice) {
                $bill->invoice_number = $invoice->invoice_number;
            }
        }

        return response()->json([
            'bill' => $bill->toArray(),
        ]);
    }

    /**
     * Show bill details.
     */
    public function show(Bill $bill)
    {
        $shop = $this->receiptShopForBill($bill);

        return Inertia::render('Studio/Bills/Show', [
            'bill' => $bill->load(['items.category', 'items.stockItem.variant.product.category', 'createdBy', 'editor', 'commission']),
            'shopInfo' => ShopReceiptProfile::asShopInfo($shop),
            'invoiceSettings' => InvoiceSetting::getSettings(),
        ]);
    }

    /**
     * Print-friendly invoice page (A4).
     */
    public function printView(Request $request, Bill $bill)
    {
        $bill->load(['items.category', 'items.stockItem.variant.product.category', 'editor']);
        $shop = $this->receiptShopForBill($bill);

        return Inertia::render('Studio/Bills/Print', [
            'bill' => $bill,
            'print_type' => $request->query('type', 'a4'),
            'invoiceSettings' => InvoiceSetting::getSettings(),
            'shopInfo' => ShopReceiptProfile::asShopInfo($shop),
        ]);
    }

    /**
     * Resolve which shop's branding to show on a bill receipt.
     */
    private function receiptShopForBill(Bill $bill): Shop
    {
        if ($bill->shop_id) {
            $billShop = Shop::find($bill->shop_id);
            if ($billShop) {
                return $billShop;
            }
        }

        return app(Shop::class);
    }

    /**
     * Show bill edit form.
     */
    public function edit(Bill $bill)
    {
        // Prevent editing delivered bills
        if ($bill->status === 'delivered') {
            return redirect()->route('studio.bills.show', $bill->id)
                ->with('error', 'Cannot edit delivered bills.');
        }

        $activeShop = app(Shop::class);

        return Inertia::render('Studio/Bills/Edit', [
            'bill' => $bill->load(['items', 'dealerCommission']),
            'itemTypes' => BillCategory::query()->where('is_active', true)->get(['id', 'name', 'default_description', 'no_commission']),
            'categories' => BillCategory::query()->where('is_active', true)->get(['id', 'name', 'default_description', 'no_commission']),
            'editors' => Employee::query()
                ->forShop($activeShop->id)
                ->editors()
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'default_commission_pct']),
            'dealers' => Employee::query()
                ->forShop($activeShop->id)
                ->dealers()
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'default_commission_pct']),
        ]);
    }

    /**
     * Update an existing bill.
     */
    public function update(Request $request, Bill $bill)
    {
        if ($bill->status === 'delivered') {
            return redirect()->back()->with('error', 'Cannot modify delivered bills.');
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable',
            'items.*.category_id' => 'nullable|exists:bill_categories,id',
            'items.*.is_stock_item' => 'nullable|boolean',
            'items.*.stock_item_id' => 'nullable|exists:inventory,id',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_type' => 'nullable|string|in:amount,percent',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'editor_id' => 'nullable|exists:employees,id',
            'commission_pct' => 'nullable|numeric|min:0|max:100',
            'is_commission_applicable' => 'boolean',
            'dealer_id' => 'nullable|exists:employees,id',
            'dealer_commission_pct' => 'nullable|numeric|min:0|max:100',
            'is_dealer_commission_applicable' => 'boolean',
            'notes' => 'nullable|string',
            'creation_charge_items' => 'nullable|array',
            'creation_charge_items.*.label' => 'required|string|max:255',
            'creation_charge_items.*.amount' => 'required|numeric|min:0',
            'creation_charge_items.*.editor_id' => 'nullable|exists:employees,id',
            'creation_charge_items.*.dealer_id' => 'nullable|exists:employees,id',
            'dealer_commission_items' => 'nullable|array',
            'dealer_commission_items.*.label' => 'required|string|max:255',
            'dealer_commission_items.*.amount' => 'required|numeric|min:0',
            'dealer_commission_items.*.dealer_id' => 'nullable|exists:employees,id',
        ]);

        try {
            DB::transaction(function () use ($bill, $validated) {
                // Update basic fields
                $bill->update([
                    'editor_id' => $validated['editor_id'] ?? $bill->editor_id,
                    'commission_pct' => $validated['commission_pct'] ?? $bill->commission_pct,
                    'is_commission_applicable' => $validated['is_commission_applicable'] ?? $bill->is_commission_applicable,
                    'dealer_id' => array_key_exists('dealer_id', $validated) ? $validated['dealer_id'] : $bill->dealer_id,
                    'dealer_commission_pct' => array_key_exists('dealer_commission_pct', $validated) ? $validated['dealer_commission_pct'] : $bill->dealer_commission_pct,
                    'is_dealer_commission_applicable' => array_key_exists('is_dealer_commission_applicable', $validated) ? (bool) $validated['is_dealer_commission_applicable'] : $bill->is_dealer_commission_applicable,
                    'discount_amount' => $validated['discount_amount'] ?? $bill->discount_amount,
                    'notes' => $validated['notes'] ?? $bill->notes,
                ]);

                $items = array_map(function ($item) {
                    if (empty($item['description'])) {
                        $categoryName = null;
                        if (! empty($item['category_id'])) {
                            $categoryName = \App\Models\BillCategory::where('id', $item['category_id'])->value('name');
                        }
                        $item['description'] = $categoryName ?: 'Item';
                    }
                    return $item;
                }, $validated['items']);

                // Update items (Simple approach: delete and recreate)
                $bill->items()->delete();
                foreach ($items as $item) {
                    $qty = (float) $item['quantity'];
                    $price = (float) $item['unit_price'];
                    $discType = $item['discount_type'] ?? 'amount';
                    $discVal = (float) ($item['discount_value'] ?? 0);

                    $lineTotalRaw = $qty * $price;
                    $lineDiscountAmount = 0.0;
                    if ($discVal > 0) {
                        if ($discType === 'percent') {
                            $lineDiscountAmount = round(($lineTotalRaw * $discVal) / 100, 2);
                        } else {
                            $lineDiscountAmount = round($discVal * $qty, 2);
                        }
                    }
                    $lineDiscountAmount = min($lineTotalRaw, $lineDiscountAmount);
                    $lineTotal = round(max(0, $lineTotalRaw - $lineDiscountAmount), 2);

                    $bill->items()->create([
                        'category_id' => $item['category_id'] ?? null,
                        'is_stock_item' => $item['is_stock_item'] ?? false,
                        'stock_item_id' => $item['stock_item_id'] ?? null,
                        'description' => $item['description'],
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'discount_type' => $discType,
                        'discount_value' => $discVal,
                        'discount_amount' => $lineDiscountAmount,
                        'line_total' => $lineTotal,
                    ]);
                }

                // Recalculate totals
                $subtotal = $bill->items->sum(fn ($i) => $i->quantity * $i->unit_price);
                $totalLineDiscount = $bill->items->sum(fn ($i) => $i->discount_amount);
                $orderDiscountAmount = (float) ($validated['discount_amount'] ?? $bill->discount_amount ?? 0);
                $discountAmount = min($subtotal, $totalLineDiscount + $orderDiscountAmount);
                $afterDiscount = max(0, $subtotal - $discountAmount + (float) ($bill->creation_charge ?? 0));

                $bill->update([
                    'subtotal' => $subtotal,
                    'discount_amount' => $discountAmount,
                    'after_discount' => $afterDiscount,
                ]);

                // Delete existing commissions/ledger entries for this bill and recreate based on creation_charge_items
                $bill->commission()->delete();
                $bill->dealerCommission()->delete();
                SalaryLedgerEntry::where('title', 'like', "Creation Charge {$bill->bill_number}%")->delete();

                $creationChargeItems = $validated['creation_charge_items'] ?? [];
                $dealerCommissionItems = $validated['dealer_commission_items'] ?? [];
                
                // Fallback for compatibility if empty
                if (empty($creationChargeItems) && !empty($bill->creation_charge)) {
                    $creationChargeItems = [
                        [
                            'label' => 'Creation charge',
                            'amount' => (float)$bill->creation_charge,
                            'editor_id' => $validated['editor_id'] ?? $bill->editor_id,
                        ]
                    ];
                }

                if (empty($dealerCommissionItems) && !empty($bill->creation_charge) && ($validated['dealer_id'] ?? $bill->dealer_id)) {
                    $dealerCommissionItems = [
                        [
                            'label' => 'Referral commission',
                            'amount' => (float)$bill->creation_charge,
                            'dealer_id' => $validated['dealer_id'] ?? $bill->dealer_id,
                            'is_legacy' => true,
                        ]
                    ];
                }

                // Process Editors
                foreach ($creationChargeItems as $cItem) {
                    $cAmount = (float) ($cItem['amount'] ?? 0);
                    if ($cAmount <= 0) {
                        continue;
                    }

                    $cEditorId = !empty($cItem['editor_id']) ? (int) $cItem['editor_id'] : null;

                    // Editor Commission
                    if ($cEditorId && $bill->is_commission_applicable) {
                        $editor = Employee::query()->find($cEditorId);
                        if ($editor) {
                            $commissionPct = (float) ($editor->default_commission_pct ?? 0);
                            if ($commissionPct > 0) {
                                EditorCommission::create([
                                    'shop_id' => $bill->shop_id,
                                    'bill_id' => $bill->id,
                                    'editor_id' => $editor->id,
                                    'commission_date' => $bill->created_at ? $bill->created_at->toDateString() : now()->toDateString(),
                                    'total_bill_amt' => $bill->after_discount,
                                    'commissionable_amount' => $cAmount,
                                    'commission_pct' => $commissionPct,
                                    'commission_amt' => round($cAmount * $commissionPct / 100, 2),
                                    'creation_charge_amt' => $cAmount,
                                    'is_paid' => false,
                                    'job_description' => $cItem['label'] ?? 'Creation charge',
                                ]);
                            }
                        }
                    }

                    // Editor Salary Allowance
                    if ($cEditorId) {
                        $periodDate = now()->startOfMonth();
                        try {
                            $salaryProfile = SalaryProfile::query()->firstOrCreate(
                                [
                                    'employee_id' => $cEditorId,
                                    'month' => $periodDate,
                                ],
                                [
                                    'basic_salary' => 0,
                                    'attendance_allowance' => 0,
                                    'overtime_rate' => 0,
                                    'notes' => 'Auto-created from bill creation charges',
                                ]
                            );
                        } catch (\PDOException $e) {
                            if (str_contains($e->getMessage(), 'UNIQUE constraint failed') || str_contains($e->getMessage(), 'Duplicate entry')) {
                                $salaryProfile = SalaryProfile::query()
                                    ->where('employee_id', $cEditorId)
                                    ->where('month', $periodDate->toDateString())
                                    ->first();
                            } else {
                                throw $e;
                            }
                        }

                        if ($salaryProfile) {
                            SalaryLedgerEntry::query()->create([
                                'salary_profile_id' => $salaryProfile->id,
                                'type' => 'allowance',
                                'title' => "Creation Charge {$bill->bill_number} - " . ($cItem['label'] ?? 'Charge'),
                                'entry_date' => now()->toDateString(),
                                'period' => $periodDate->toDateString(),
                                'amount' => $cAmount,
                                'notes' => "Creation/editing allowance for bill {$bill->bill_number}",
                            ]);
                        }
                    }
                }

                // Process Dealers
                foreach ($dealerCommissionItems as $dItem) {
                    $dAmount = (float) ($dItem['amount'] ?? 0);
                    if ($dAmount <= 0) {
                        continue;
                    }

                    $cDealerId = !empty($dItem['dealer_id']) ? (int) $dItem['dealer_id'] : null;

                    // Dealer Commission
                    if ($cDealerId && $bill->is_dealer_commission_applicable) {
                        $dealer = Employee::query()->find($cDealerId);
                        if ($dealer) {
                            $isLegacy = !empty($dItem['is_legacy']);
                            $commissionPct = (float) ($dealer->default_commission_pct ?? 0);
                            
                            if ($isLegacy) {
                                $commissionAmt = round($dAmount * $commissionPct / 100, 2);
                                $commissionableAmount = $dAmount;
                            } else {
                                $commissionAmt = $dAmount;
                                $commissionableAmount = $dAmount;
                                $commissionPct = 100.00;
                            }

                            DealerCommission::create([
                                'shop_id' => $bill->shop_id,
                                'bill_id' => $bill->id,
                                'dealer_id' => $dealer->id,
                                'commission_date' => $bill->created_at ? $bill->created_at->toDateString() : now()->toDateString(),
                                'total_bill_amt' => $bill->after_discount,
                                'commissionable_amount' => $commissionableAmount,
                                'commission_pct' => $commissionPct,
                                'commission_amt' => $commissionAmt,
                                'is_paid' => false,
                            ]);
                        }
                    }
                }
            });

            return redirect()->route('studio.bills.show', $bill->id)
                ->with('success', "Bill {$bill->bill_number} updated successfully.");
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Failed to update bill: '.$e->getMessage());
        }
    }

    /**
     * Update bill status (ready, delivered, etc.).
     */
    public function updateStatus(Request $request, Bill $bill)
    {
        $validated = $request->validate([
            'status' => 'required|in:processing,ready,delivered',
        ]);

        $bill = $this->billService->updateBill($bill, $validated);

        return redirect()->route('studio.bills.show', $bill->id)
            ->with('success', "Bill status updated to {$bill->status}.");
    }

    /**
     * Delete a bill — super admin only.
     */
    public function destroy(Bill $bill)
    {
        // Only super admins can delete bills
        if (! request()->user()?->isSuperAdmin()) {
            abort(403, 'Only super admins can delete bills.');
        }

        Bill::query()->whereKey($bill->getKey())->delete();

        return redirect()->route('studio.sales.index')
            ->with('success', "Bill {$bill->bill_number} has been deleted.");
    }

    /**
     * Complete a bill: mark paid, create Sale and Payment, create/record commissions,
     * update salary ledger entries and related reports. Optionally trigger print.
     */
    public function complete(Request $request, Bill $bill)
    {
        $validated = $request->validate([
            'print_type' => 'nullable|in:a4,thermal,none',
        ]);

        try {
            DB::transaction(function () use ($bill, $request) {
                $bill->load(['items', 'commission']);
                // Prevent double-processing
                if ($bill->status === 'delivered') {
                    return;
                }

                // Create a Sale record mirroring the bill for reporting
                $sale = Sale::create([
                    'shop_id' => $bill->shop_id ?? app(Shop::class)->id,
                    'sale_number' => 'SALE-'.$bill->bill_number,
                    'customer_id' => $bill->customer_id,
                    'customer_name' => $bill->customer_name,
                    'customer_phone' => $bill->customer_phone,
                    'reference_number' => $bill->reference_number,
                    'bank_name' => $bill->bank_name,
                    'payment_method' => $bill->payment_method,
                    'cashier_id' => $request->user()?->getAuthIdentifier(),
                    'editor_id' => $bill->editor_id,
                    'subtotal' => $bill->subtotal,
                    'discount_amount' => $bill->discount_amount,
                    'total_amount' => $bill->after_discount,
                    'commission_rate' => (float) ($bill->commission_pct ?? 0),
                    'commission_amount' => optional($bill->commission)->commission_amt ?? 0,
                    'status' => 'completed',
                    'completed_at' => now(),
                    'notes' => $bill->notes,
                ]);

                // Copy items to sale for detailed reporting
                foreach ($bill->items as $item) {
                    $qty = (float) $item->quantity;
                    $price = (float) $item->unit_price;
                    $lineDisc = (float) ($item->discount_amount ?? 0);
                    $lineTotal = (float) ($item->line_total ?? ($price * $qty));

                    $discountPct = 0.00;
                    if ($qty > 0 && $price > 0) {
                        if ($item->discount_type === 'percent') {
                            $discountPct = (float) ($item->discount_value ?? 0);
                        } else {
                            $discountPct = round(($lineDisc / ($price * $qty)) * 100, 2);
                        }
                    }

                    $sale->items()->create([
                        'product_name' => $item->description,
                        'unit_price' => $price,
                        'quantity' => $qty,
                        'discount_pct' => $discountPct,
                        'line_discount_amount' => $lineDisc,
                        'line_total' => $lineTotal,
                    ]);
                }

                // Create a Payment for the sale based on the actual amount paid
                $paymentAmount = 0.0;
                if (in_array($bill->payment_method, ['cash', 'card', 'bank_transfer'], true)) {
                    $paymentAmount = (float) $bill->after_discount;
                } elseif ($bill->payment_method === 'advance') {
                    $paymentAmount = (float) $bill->advance_paid;
                }

                if ($paymentAmount > 0) {
                    Payment::create([
                        'sale_id' => $sale->id,
                        'method' => $bill->payment_method,
                        'amount' => $paymentAmount,
                        'reference_no' => $bill->reference_number,
                        'gateway' => null,
                        'status' => 'completed',
                        'confirmed_at' => now(),
                    ]);
                }

                // Update the bill status and payment details
                if (in_array($bill->payment_method, ['credit', 'advance'], true)) {
                    $bill->update([
                        'status' => 'delivered',
                        // Keep paid_amount and balance_due as they were originally calculated
                    ]);
                } else {
                    $bill->update([
                        'status' => 'delivered',
                        'paid_amount' => $bill->after_discount,
                        'balance_due' => 0,
                    ]);
                }

                // Link Sale to CreditBill if it exists for this bill
                $creditBill = \App\Models\CreditBill::where('bill_id', $bill->id)->first();
                if ($creditBill) {
                    $creditBill->update([
                        'sale_id' => $sale->id,
                    ]);
                }

                // Ensure editor commission exists and record creation_charge allocation
                if ($bill->editor_id && $bill->is_commission_applicable) {
                    $commissionRate = (float) ($bill->commission_pct ?? Employee::query()
                        ->forShop((int) ($bill->shop_id ?? app(Shop::class)->id))
                        ->whereKey($bill->editor_id)
                        ->value('default_commission_pct') ?? 0);

                    $commission = $bill->commission;
                    if ($commission && (float) $commission->commission_amt <= 0 && ! $commission->is_paid) {
                        $commission->delete();
                        $commission = null;
                    }

                    if (! $commission && $commissionRate > 0 && $this->billService->resolveCommissionableAmount($bill) > 0) {
                        $commission = $this->billService->createCommissionRecord(
                            $bill,
                            (int) $bill->editor_id,
                            $commissionRate,
                        );
                    }

                    // Immediately mark commission paid and add to salary ledger
                    if ($commission && ! $commission->is_paid && (float) $commission->commission_amt > 0) {
                        $this->billService->markCommissionPaid($commission, $request->user()?->getAuthIdentifier() ?? 0);
                    }

                    // Immediately mark dealer commission paid and add to salary ledger
                    $bill->loadMissing(['dealerCommissions']);
                    foreach ($bill->dealerCommissions as $dComm) {
                        if (!$dComm->is_paid && (float) $dComm->commission_amt > 0) {
                            $this->billService->markDealerCommissionPaid($dComm, $request->user()?->getAuthIdentifier() ?? 0);
                        }
                    }
                }

                // TODO: update daily sales aggregates/reports (left as hooks for reporting module)
            });

            // Trigger print if requested
            return redirect()->route('studio.pos.index', [
                'saved_bill' => $bill->id,
                'completed_bill' => $bill->id,
                'print' => $validated['print_type'] ?? 'none',
            ])
                ->with('success', "Bill {$bill->bill_number} completed and marked paid.")
                ->with('completed_bill_id', $bill->id)
                ->with('completed_print_type', $validated['print_type'] ?? 'none');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Failed to complete bill: '.$e->getMessage());
        }
    }

    /**
     * Record a partial or full payment on an existing advance/credit bill.
     */
    public function payBalance(Request $request, Bill $bill)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,card,bank_transfer',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
        ]);

        try {
            $creditBill = CreditBill::where('bill_id', $bill->id)->first();
            if (! $creditBill) {
                return back()->with('error', 'No advance/credit record found for this bill.');
            }

            // Include the current user as front officer for the payment
            $validated['front_officer_id'] = Employee::resolveForUser($request->user(), app(Shop::class)->id);

            app(CreditBillService::class)->recordPayment($creditBill, $validated);

            return back()->with('success', 'Payment recorded successfully. Balance updated.');
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (\Throwable $e) {
            return back()->with('error', 'Failed to record payment: '.$e->getMessage());
        }
    }
}
