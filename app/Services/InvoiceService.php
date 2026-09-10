<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Quotation;
use App\Models\Refund;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    // ── Invoice Number Generator ──────────────────────────────────────────

    public function generateInvoiceNumber(string $module): string
    {
        $prefix = match ($module) {
            'photography' => 'INV-PH',
            'studio'      => 'INV-ST',
            default       => 'INV-GN',
        };

        $activeShop = app(\App\Modules\Shops\Models\Shop::class);

        $last = Invoice::forShop($activeShop->id)
            ->where('invoice_number', 'like', "{$prefix}-%")
            ->lockForUpdate()
            ->orderByDesc('id')
            ->first();

        $next = $last
            ? (int) substr($last->invoice_number, strlen($prefix) + 1) + 1
            : 1;

        return sprintf('%s-%04d', $prefix, $next);
    }

    // ── Create Invoice ────────────────────────────────────────────────────

    public function createInvoice(array $data, int $createdBy): Invoice
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $module         = $data['module'] ?? 'general';
            $taxRate        = (float) ($data['tax_rate'] ?? 0);
            $discountAmount = (float) ($data['discount_amount'] ?? 0);

            $subtotal   = 0.0;
            $itemsData  = [];

            foreach ($data['items'] ?? [] as $item) {
                $qty       = (int)   ($item['quantity']     ?? 1);
                $price     = (float) ($item['unit_price']   ?? 0);
                $disc      = (float) ($item['discount_pct'] ?? 0);
                $lineTotal = round($qty * $price * (1 - $disc / 100), 2);
                $subtotal += $lineTotal;

                $itemsData[] = [
                    'description'  => $item['description'],
                    'product_id'   => $item['product_id']  ?? null,
                    'product_sku'  => $item['product_sku'] ?? null,
                    'quantity'     => $qty,
                    'unit_price'   => $price,
                    'discount_pct' => $disc,
                    'line_total'   => $lineTotal,
                ];
            }

            $subtotal      = round($subtotal, 2);
            $afterDiscount = max(0, $subtotal - $discountAmount);
            $taxAmount     = round($afterDiscount * $taxRate / 100, 2);
            $totalAmount   = round($afterDiscount + $taxAmount, 2);

            $invoice = Invoice::create([
                'shop_id'         => app(\App\Modules\Shops\Models\Shop::class)->id,
                'invoice_number'  => $this->generateInvoiceNumber($module),
                'sale_id'         => $data['sale_id']        ?? null,
                'quotation_id'    => $data['quotation_id']   ?? null,
                'customer_id'     => $data['customer_id']    ?? null,
                'customer_name'   => $data['customer_name'],
                'customer_phone'  => $data['customer_phone'] ?? null,
                'employee_id'     => $data['employee_id']    ?? null,
                'module'          => $module,
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_rate'        => $taxRate,
                'tax_amount'      => $taxAmount,
                'total_amount'    => $totalAmount,
                'status'          => $data['status']         ?? 'draft',
                'notes'           => $data['notes']    ?? null,
                'due_date'        => $data['due_date'] ?? null,
                'created_by'      => $createdBy,
                'advance_payments' => $data['advance_payments'] ?? null,
            ]);

            foreach ($itemsData as $item) {
                $invoice->items()->create($item);
            }

            if (in_array($invoice->status, ['paid', 'partially_paid'])) {
                $invoice->load('items');
                $this->deductStockForInvoice($invoice);
            }

            return $invoice->load(['items', 'employee:id,name', 'createdBy:id,name']);
        });
    }

    // ── Convert Quotation → Invoice ───────────────────────────────────────

    public function createFromQuotation(
        Quotation $quotation,
        ?int $employeeId,
        int $createdBy,
        ?float $taxRate = null,
    ): Invoice {
        return DB::transaction(function () use ($quotation, $employeeId, $createdBy, $taxRate) {
            $taxRate = $taxRate ?? 0.0;

            $afterDiscount = max(0, (float) $quotation->subtotal - (float) $quotation->discount_amount);
            $taxAmount     = round($afterDiscount * $taxRate / 100, 2);
            $totalAmount   = round($afterDiscount + $taxAmount, 2);

            $invoice = Invoice::create([
                'shop_id'         => app(\App\Modules\Shops\Models\Shop::class)->id,
                'invoice_number'  => $this->generateInvoiceNumber('photography'),
                'quotation_id'    => $quotation->id,
                'customer_name'   => $quotation->customer_name,
                'customer_phone'  => $quotation->customer_phone,
                'employee_id'     => $employeeId,
                'module'          => 'photography',
                'subtotal'        => $quotation->subtotal,
                'discount_amount' => $quotation->discount_amount,
                'tax_rate'        => $taxRate,
                'tax_amount'      => $taxAmount,
                'total_amount'    => $totalAmount ?: (float) $quotation->total_amount,
                'status'          => 'draft',
                'notes'           => "Converted from quotation {$quotation->quote_number}",
                'created_by'      => $createdBy,
            ]);

            foreach ($quotation->items as $qItem) {
                $invoice->items()->create([
                    'description' => $qItem->description,
                    'product_id'  => $qItem->product_id,
                    'product_sku' => $qItem->product_sku,
                    'quantity'    => $qItem->quantity,
                    'unit_price'  => $qItem->unit_price,
                    'line_total'  => $qItem->line_total,
                ]);
            }

            try {
                $quotation->update(['status' => 'converted']);
            } catch (\Throwable $e) {
                // Fallback to 'approved' if production DB enum column has not been migrated yet
                try {
                    $quotation->update(['status' => 'approved']);
                } catch (\Throwable $e2) {
                    // Ignore status update error if ENUM is strictly locked
                }
            }

            return $invoice->load(['items', 'employee:id,name']);
        });
    }

    // ── Convert POS Sale → Invoice ────────────────────────────────────────

    public function createFromSale(
        Sale $sale,
        ?int $employeeId,
        int $createdBy,
        string $module = 'studio',
        ?string $customerName = null,
    ): Invoice {
        return DB::transaction(function () use ($sale, $employeeId, $createdBy, $module, $customerName) {
            $invoice = Invoice::create([
                'shop_id'         => app(\App\Modules\Shops\Models\Shop::class)->id,
                'invoice_number'  => $this->generateInvoiceNumber($module),
                'sale_id'         => $sale->id,
                'customer_name'   => $customerName ?? 'Walk-in Customer',
                'employee_id'     => $employeeId,
                'module'          => $module,
                'subtotal'        => $sale->subtotal,
                'discount_amount' => $sale->discount_amount,
                'tax_rate'        => 0,
                'tax_amount'      => $sale->tax_amount,
                'total_amount'    => $sale->total_amount,
                'status'          => 'sent',
                'notes'           => "Generated from POS sale {$sale->sale_number}",
                'created_by'      => $createdBy,
            ]);

            foreach ($sale->items as $item) {
                $invoice->items()->create([
                    'description'  => $item->product_name,
                    'product_sku'  => $item->product_sku ?? null,
                    'quantity'     => $item->quantity,
                    'unit_price'   => $item->unit_price,
                    'discount_pct' => $item->discount_pct ?? 0,
                    'line_total'   => $item->line_total,
                ]);
            }

            return $invoice->load(['items', 'employee:id,name']);
        });
    }

    // ── Update Invoice ────────────────────────────────────────────────────

    public function updateInvoice(Invoice $invoice, array $data): Invoice
    {
        return DB::transaction(function () use ($invoice, $data) {
            $taxRate        = (float) ($data['tax_rate']        ?? $invoice->tax_rate);
            $discountAmount = (float) ($data['discount_amount'] ?? $invoice->discount_amount);
            $subtotal       = (float) $invoice->subtotal;

            $oldStatus = $invoice->status;
            $oldIsTracked = in_array($oldStatus, ['paid', 'partially_paid']);

            if ($oldIsTracked) {
                $invoice->load('items');
                $this->restoreStockForInvoice($invoice);
            }

            if (isset($data['items'])) {
                $invoice->items()->delete();
                $subtotal = 0.0;

                foreach ($data['items'] as $item) {
                    $qty       = (int)   ($item['quantity']     ?? 1);
                    $price     = (float) ($item['unit_price']   ?? 0);
                    $disc      = (float) ($item['discount_pct'] ?? 0);
                    $lineTotal = round($qty * $price * (1 - $disc / 100), 2);
                    $subtotal += $lineTotal;

                    $invoice->items()->create([
                        'description'  => $item['description'],
                        'product_id'   => $item['product_id']  ?? null,
                        'product_sku'  => $item['product_sku'] ?? null,
                        'quantity'     => $qty,
                        'unit_price'   => $price,
                        'discount_pct' => $disc,
                        'line_total'   => $lineTotal,
                    ]);
                }
                $subtotal = round($subtotal, 2);
            }

            $afterDiscount = max(0, $subtotal - $discountAmount);
            $taxAmount     = round($afterDiscount * $taxRate / 100, 2);
            $totalAmount   = round($afterDiscount + $taxAmount, 2);

            $newStatus = $data['status'] ?? $invoice->status;

            $invoice->update([
                'customer_name'   => $data['customer_name']   ?? $invoice->customer_name,
                'customer_phone'  => $data['customer_phone']  ?? $invoice->customer_phone,
                'employee_id'     => array_key_exists('employee_id', $data) ? $data['employee_id'] : $invoice->employee_id,
                'module'          => $data['module']          ?? $invoice->module,
                'status'          => $newStatus,
                'notes'           => array_key_exists('notes', $data) ? $data['notes'] : $invoice->notes,
                'due_date'        => array_key_exists('due_date', $data) ? $data['due_date'] : $invoice->due_date,
                'advance_payments' => array_key_exists('advance_payments', $data) ? $data['advance_payments'] : $invoice->advance_payments,
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_rate'        => $taxRate,
                'tax_amount'      => $taxAmount,
                'total_amount'    => $totalAmount,
            ]);

            $newIsTracked = in_array($newStatus, ['paid', 'partially_paid']);
            if ($newIsTracked) {
                $invoice->load('items');
                $this->deductStockForInvoice($invoice);
            }

            return $invoice->fresh(['items', 'employee:id,name', 'refunds']);
        });
    }

    // ── Process Invoice Refund ────────────────────────────────────────────

    /**
     * FIX: Allow refunds for ALL statuses that mean payment has occurred.
     * The original was too strict and blocked valid refunds.
     *
     * Refundable statuses:
     *   - paid             = full payment received
     *   - partially_paid   = partial payment received
     *   - sent             = invoice sent (may have been paid outside system)
     *   - awaiting_payment = payment pending but customer has committed
     */
    public function processInvoiceRefund(
        Invoice $invoice,
        float $amount,
        string $reason,
        int $processedBy,
    ): Refund {
        return DB::transaction(function () use ($invoice, $amount, $reason, $processedBy) {

            // ── Guard 1: Status must allow refund ─────────────────────────
            $refundableStatuses = ['paid', 'partially_paid', 'sent', 'awaiting_payment'];

            if (!in_array($invoice->status, $refundableStatuses)) {
                throw new \InvalidArgumentException(
                    "Cannot refund an invoice with status '{$invoice->status}'. " .
                    "Only paid, partially paid, sent, or awaiting payment invoices can be refunded."
                );
            }

            // ── Guard 2: Amount must be positive ──────────────────────────
            if ($amount <= 0) {
                throw new \InvalidArgumentException('Refund amount must be greater than zero.');
            }

            // ── Guard 3: Over-refund prevention ───────────────────────────
            $alreadyRefunded = (float) $invoice->refunds()
                ->where('status', Refund::STATUS_COMPLETED)
                ->sum('amount');

            $remaining = round((float) $invoice->total_amount - $alreadyRefunded, 2);

            if (round($amount, 2) > $remaining) {
                throw new \InvalidArgumentException(
                    sprintf(
                        'Refund amount LKR %s exceeds remaining refundable balance of LKR %s.',
                        number_format($amount, 2),
                        number_format($remaining, 2)
                    )
                );
            }

            // ── Create refund record ──────────────────────────────────────
            $isFullRefund = round($amount, 2) >= round((float) $invoice->total_amount, 2);

            $refund = Refund::create([
                'shop_id'      => $invoice->shop_id,
                'sale_id'      => $invoice->sale_id, // null if no POS sale — that is fine
                'invoice_id'   => $invoice->id,
                'amount'       => round($amount, 2),
                'type'         => $isFullRefund ? Refund::TYPE_FULL : Refund::TYPE_PARTIAL,
                'reason'       => $reason,
                'processed_by' => $processedBy,
                'status'       => Refund::STATUS_COMPLETED,
            ]);

            // ── Update invoice status ─────────────────────────────────────
            $oldStatus = $invoice->status;
            $newStatus = $isFullRefund ? 'refunded' : 'partially_paid';

            $oldIsTracked = in_array($oldStatus, ['paid', 'partially_paid']);
            $newIsTracked = in_array($newStatus, ['paid', 'partially_paid']);

            if ($oldIsTracked && !$newIsTracked) {
                $invoice->load('items');
                $this->restoreStockForInvoice($invoice);
            }

            $invoice->update(['status' => $newStatus]);

            return $refund;
        });
    }

    // ── Finance Dashboard Stats ───────────────────────────────────────────

    public function getFinanceStats(): array
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $now        = now();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd   = $now->copy()->endOfMonth();

        $totalRevenue = Invoice::forShop($activeShop->id)->where('status', 'paid')->sum('total_amount');

        $monthRevenue = Invoice::forShop($activeShop->id)->where('status', 'paid')
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->sum('total_amount');

        $monthRefunds = Refund::forShop($activeShop->id)->where('status', Refund::STATUS_COMPLETED)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->sum('amount');

        $monthReturns = (float) DB::table('product_returns')
            ->leftJoin('bills', 'product_returns.sale_id', '=', 'bills.id')
            ->leftJoin('invoices', 'product_returns.invoice_id', '=', 'invoices.id')
            ->where('product_returns.shop_id', $activeShop->id)
            ->where('product_returns.status', 'completed')
            ->whereBetween(DB::raw('COALESCE(bills.created_at, invoices.created_at, product_returns.created_at)'), [$monthStart, $monthEnd])
            ->sum('product_returns.total_amount');

        $openInvoices = Invoice::forShop($activeShop->id)->whereIn('status', ['draft', 'sent', 'awaiting_payment'])->count();

        $outstandingAmount = Invoice::forShop($activeShop->id)->whereIn('status', ['sent', 'awaiting_payment', 'partially_paid'])
            ->sum('total_amount');

        $netProfit = round((float) $monthRevenue - (float) $monthRefunds - (float) $monthReturns, 2);

        $pendingRefunds = Refund::forShop($activeShop->id)->where('status', Refund::STATUS_PENDING)->count();

        $dailyRevenue = Invoice::forShop($activeShop->id)->where('status', 'paid')
            ->where('created_at', '>=', $now->copy()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'total' => (float) $row->total]);

        return [
            'totalRevenue'      => (float) $totalRevenue,
            'monthRevenue'      => (float) $monthRevenue,
            'monthRefunds'      => (float) $monthRefunds,
            'monthReturns'      => (float) $monthReturns,
            'netProfit'         => $netProfit,
            'openInvoices'      => $openInvoices,
            'outstandingAmount' => (float) $outstandingAmount,
            'pendingRefunds'    => $pendingRefunds,
            'dailyRevenue'      => $dailyRevenue,
        ];
    }

    // ── Helper methods for stock tracking ─────────────────────────────────

    private function deductStockForInvoice(Invoice $invoice): void
    {
        if ($invoice->sale_id) {
            return;
        }
        $inventoryService = app(\App\Contracts\InventoryServiceInterface::class);
        foreach ($invoice->items as $item) {
            if ($item->product_id) {
                $inventoryService->deductStock($invoice->shop_id, $item->product_id, $item->quantity);
            }
        }
    }

    private function restoreStockForInvoice(Invoice $invoice): void
    {
        if ($invoice->sale_id) {
            return;
        }
        $inventoryService = app(\App\Contracts\InventoryServiceInterface::class);
        foreach ($invoice->items as $item) {
            if ($item->product_id) {
                $inventoryService->restoreStock($invoice->shop_id, $item->product_id, $item->quantity);
            }
        }
    }

    public function cancelInvoice(Invoice $invoice): Invoice
    {
        return DB::transaction(function () use ($invoice) {
            $oldStatus = $invoice->status;
            if (in_array($oldStatus, ['paid', 'partially_paid'])) {
                $invoice->load('items');
                $this->restoreStockForInvoice($invoice);
            }
            $invoice->update(['status' => 'cancelled']);
            return $invoice;
        });
    }
}