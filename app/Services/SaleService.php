<?php

namespace App\Services;

use App\Contracts\InventoryServiceInterface;
use App\Exceptions\InsufficientStockException;
use App\Models\CreditBill;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalaryLedgerEntry;
use App\Models\SalaryProfile;
use App\Modules\Shops\Models\Shop;
use App\Modules\Shops\Services\ShopService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SaleService
{
    public function __construct(
        private CartService $cart,
        private InventoryServiceInterface $inventory,
        private SaleNumberGenerator $saleNumberGenerator,
    ) {}

    /**
     * Finalize a sale — the main transaction.
     *
     * @param array $cartItems     Raw items from frontend cart
     * @param array $paymentData   Payment method(s) from frontend
     * @param int   $cashierId     auth()->id()
     * @param array $options       Optional: customer_id, editor_id,
     *                             cart_discount_pct, tax_rate,
     *                             commission_rate, commission_mode, notes
     *
     * @return Sale  Fully loaded sale with items + payments
     * @throws InsufficientStockException
     * @throws \Throwable
     */
    public function finalizeSale(
        array $cartItems,
        array $paymentData,
        int $cashierId,
        array $options = []
    ): Sale {
        try {
            // ── 1. Validate cart before touching DB ──────────────────
            $errors = $this->cart->validate($cartItems);
            if (!empty($errors)) {
                throw new \InvalidArgumentException(implode(', ', $errors));
            }

            // ── 2. Validate payment amounts match cart total exactly ──
            // Must come before the transaction — no point opening a
            // transaction if the payment is already wrong
            $this->validatePaymentAmounts($cartItems, $paymentData, $options);

            // ── 3. Wrap everything in a DB transaction ────────────────
            // If ANY step fails → everything rolls back automatically
            return DB::transaction(function () use ($cartItems, $paymentData, $cashierId, $options) {

                // ── 4. Calculate totals ───────────────────────────────
                $cartDiscountPct = (float) ($options['cart_discount_pct'] ?? 0);
                $taxRate = (float) ($options['tax_rate'] ?? 0);

                $totals = $this->cart->calculate($cartItems, $cartDiscountPct, $taxRate);

                // ── 5. Calculate commission ───────────────────────────
                $commissionRate = (float) ($options['commission_rate'] ?? 0);
                $commissionMode = $options['commission_mode'] ?? 'net';

                $commissionableBase = collect($totals['items'])
                    ->filter(fn ($item) => (bool) ($item['is_commissionable'] ?? true))
                    ->sum(fn ($item) => (float) $item['line_total']);

                $commissionAmount = round(($commissionableBase * $commissionRate) / 100, 2);

                $paymentMethod = $options['payment_method']
                    ?? ($paymentData[0]['method'] ?? null);

                // ── 6. Create the Sale record ─────────────────────────
                $shopId = $this->resolveShopId();

                $sale = Sale::create([
                    'shop_id' => $shopId,
                    'sale_number' => $this->saleNumberGenerator->generate(),
                    'customer_id' => $options['customer_id'] ?? null,
                    'customer_name' => $options['customer_name'] ?? null,
                    'customer_phone' => $options['customer_phone'] ?? null,
                    'reference_number' => $options['reference_number'] ?? null,
                    'bank_name' => $options['bank_name'] ?? null,
                    'payment_method' => $paymentMethod,
                    'cashier_id' => $cashierId,
                    'editor_id' => $options['editor_id'] ?? null,
                    'subtotal' => $totals['subtotal'],
                    'discount_amount' => $totals['discount_amount'],
                    'tax_amount' => $totals['tax_amount'],
                    'total_amount' => $totals['total_amount'],
                    'commission_rate' => $commissionRate,
                    'commission_amount' => $commissionAmount,
                    'commission_mode' => $commissionMode,
                    'status' => 'pending',
                    'completed_at' => null,
                    'notes' => $options['notes'] ?? null,
                ]);

                // ── 7. For each item: deduct inventory FIRST, then persist ──
                $shopId = $this->resolveShopId();

                foreach ($totals['items'] as $item) {

                    // Deduct stock first — throws if insufficient
                    $this->inventory->deductStock(
                        $shopId,
                        $item['product_id'],
                        $item['quantity']
                    );

                    // Only persisted after stock confirmed available
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $item['product_id'],
                        'product_name' => $item['product_name'],
                        'product_sku' => $item['product_sku'],
                        'unit_price' => $item['unit_price'],
                        'quantity' => $item['quantity'],
                        'discount_pct' => $item['discount_pct'],
                        'line_discount_amount' => $item['line_discount_amount'],
                        'line_total' => $item['line_total'],
                    ]);
                }

                // ── 7b. Auto-post commission to salary ledger ────────
                if (!empty($sale->editor_id) && $commissionAmount > 0) {
                    $period = now()->startOfMonth()->toDateString();

                    $salaryProfile = SalaryProfile::query()->firstOrCreate(
                        [
                            'employee_id' => $sale->editor_id,
                            'month' => $period,
                        ],
                        [
                            'basic_salary' => 0,
                            'attendance_allowance' => 0,
                            'overtime_rate' => 0,
                            'notes' => 'Auto-created from sale commission',
                        ]
                    );

                    SalaryLedgerEntry::query()->updateOrCreate(
                        [
                            'sale_id' => $sale->id,
                            'salary_profile_id' => $salaryProfile->id,
                        ],
                        [
                            'entry_date' => now()->toDateString(),
                            'type' => 'commission',
                            'period' => $period,
                            'title' => "Sale Commission {$sale->sale_number}",
                            'amount' => $commissionAmount,
                            'notes' => null,
                        ]
                    );
                }

                // ── 7c. Create credit/advance bill snapshot ───────────
                if (in_array($paymentMethod, ['credit', 'advance'], true)) {
                    CreditBill::query()->create([
                        'shop_id' => $shopId,
                        'sale_id' => $sale->id,
                        'type' => $paymentMethod,
                        'customer_name' => $options['customer_name'] ?? null,
                        'customer_phone' => $options['customer_phone'] ?? null,
                        'total_amount' => $totals['total_amount'],
                        'paid_amount' => 0,
                        'balance_amount' => $totals['total_amount'],
                        'created_by' => $options['front_officer_id'] ?? null,
                        'promise_date' => $options['promise_date'] ?? now()->toDateString(),
                        'status' => 'outstanding',
                    ]);
                }

                // ── 8. Record payment(s) ──────────────────────────────
                $this->recordPayments($sale->id, $paymentData);

                // ── 9. Mark sale as completed ─────────────────────────
                if ($sale->status === 'completed') {
                    throw new \RuntimeException('Sale already completed');
                }

                $sale->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

                // ── 10. Return fully loaded sale ──────────────────────
                return $sale->load(['items', 'payments']);
            });
        } catch (\Throwable $e) {
            Log::error('Sale finalization failed', [
                'request_id' => request()?->header('X-Request-ID'),
                'cashier_id' => $cashierId,
                'items_count' => count($cartItems),
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Process a refund against a completed sale.
     *
     * @param Sale     $sale
     * @param float    $amount      Amount to refund
     * @param string   $reason
     * @param int      $processedBy auth()->id()
     * @param int|null $invoiceId   Thinuka's invoice ID (optional for now)
     *
     * @return Refund
     * @throws \InvalidArgumentException
     * @throws \Throwable
     */
    public function processRefund(
        Sale $sale,
        float $amount,
        string $reason,
        int $processedBy,
        ?int $invoiceId = null
    ): Refund {
        try {
            // Work in cents for all comparisons — avoids float edge cases
            $amountCents = (int) round($amount * 100);
            $totalRefundedCents = (int) round(
                $sale->refunds()->where('status', 'completed')->sum('amount') * 100
            );
            $saleTotalCents = (int) round($sale->total_amount * 100);
            $maxRefundableCents = $saleTotalCents - $totalRefundedCents;

            if ($amountCents > $maxRefundableCents) {
                throw new \InvalidArgumentException(
                    'Refund amount (' . round($amountCents / 100, 2) . ') ' .
                    'exceeds refundable balance (' . round($maxRefundableCents / 100, 2) . ')'
                );
            }

            return DB::transaction(function () use (
                $sale, $amount, $reason, $processedBy, $invoiceId,
                $amountCents, $saleTotalCents, $totalRefundedCents
            ) {
                // Determine refund type using cents — no float comparison needed
                $type = ($amountCents === $saleTotalCents) ? 'full' : 'partial';

                // Create refund record
                $refund = Refund::create([
                    'shop_id' => $sale->shop_id,
                    'sale_id' => $sale->id,
                    'invoice_id' => $invoiceId,
                    'type' => $type,
                    'amount' => round($amountCents / 100, 2),
                    'reason' => $reason,
                    'processed_by' => $processedBy,
                    'status' => 'completed',
                ]);

                // Update sale status — again using cents
                $newTotalRefundedCents = $totalRefundedCents + $amountCents;
                $newStatus = ($newTotalRefundedCents >= $saleTotalCents)
                    ? 'refunded'
                    : 'partially_refunded';

                $sale->update(['status' => $newStatus]);

                // Restore inventory for full refunds only
                if ($type === 'full') {
                    $shopId = $this->resolveShopId();
                    foreach ($sale->items as $item) {
                        $this->inventory->restoreStock($shopId, $item->product_id, $item->quantity);
                    }
                }

                return $refund;
            });
        } catch (\Throwable $e) {
            Log::error('Refund processing failed', [
                'request_id' => request()?->header('X-Request-ID'),
                'sale_id' => $sale->id,
                'processed_by' => $processedBy,
                'amount' => round($amount, 2),
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function recordPayments(int $saleId, array $paymentData): void
    {
        // paymentData is always an array of payment objects now.
        // Frontend sends: [{ "method": "cash", "amount": 100 }]
        // Split:          [{ "method": "cash", "amount": 60 }, { "method": "card", "amount": 40 }]
        foreach ($paymentData as $payment) {
            if (in_array($payment['method'], ['credit', 'advance'], true)) {
                continue;
            }

            // Cash = immediately confirmed
            // Card = pending until gateway callback confirms it
            $isCash = $payment['method'] === 'cash';

            Payment::create([
                'sale_id' => $saleId,
                'method' => $payment['method'],
                'gateway' => $payment['gateway'] ?? null,
                'amount' => round($payment['amount'], 2),
                'reference_no' => $payment['reference_no'] ?? null,
                'status' => $isCash ? 'completed' : 'pending',
                'confirmed_at' => $isCash ? now() : null,
            ]);
        }
    }

    /**
     * Resolve the active shop id for the current request. Falls back to
     * the system-default shop when no request-scoped shop is bound — this
     * keeps console-driven flows (queues, seeders, tests) functional.
     *
     * @return int
     */
    private function resolveShopId(): int
    {
        if (app()->bound(Shop::class)) {
            return (int) app(Shop::class)->id;
        }

        $default = app(ShopService::class)->getDefault();

        if (!$default) {
            throw new \RuntimeException(
                'No active or default shop is available; cannot finalize a sale without a shop scope.'
            );
        }

        return (int) $default->id;
    }

    private function validatePaymentAmounts(
        array $cartItems,
        array $paymentData,
        array $options
    ): void {
        $cartDiscountPct = (float) ($options['cart_discount_pct'] ?? 0);
        $taxRate = (float) ($options['tax_rate'] ?? 0);
        $totals = $this->cart->calculate($cartItems, $cartDiscountPct, $taxRate);

        // paymentData is always an array of payment objects.
        $paidTotalCents = array_reduce($paymentData, function ($carry, $p) {
            return $carry + (int) round($p['amount'] * 100);
        }, 0);

        $expectedCents = (int) round($totals['total_amount'] * 100);

        // Payment must match exactly — not "at least".
        // Overpayment means frontend sent wrong data; don't silently accept it.
        if ($paidTotalCents !== $expectedCents) {
            throw new \InvalidArgumentException(
                'Payment total (' . round($paidTotalCents / 100, 2) . ') ' .
                'must exactly match sale total (' . round($expectedCents / 100, 2) . ')'
            );
        }
    }
}
