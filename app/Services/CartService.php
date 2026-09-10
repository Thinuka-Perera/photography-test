<?php

namespace App\Services;

class CartService
{
    private function money(float $value): float
    {
        return round($value, 2);
    }

    /**
     * Calculate all totals for a cart.
     *
     * @param array $items  Each item: [
     *   'product_id'   => int,
     *   'product_name' => string,
     *   'product_sku'  => string|null,
     *   'unit_price'   => float,
     *   'quantity'     => int,
     *   'discount_pct' => float,
     * ]
     * @param float $cartDiscountPct  Cart-level discount (0-100)
     * @param float $taxRate          Tax rate (0-100), e.g. 8.0 for 8%
     *
     * @return array
     */
    public function calculate(array $items, float $cartDiscountPct = 0, float $taxRate = 0): array
    {
        $processedItems = [];
        $subtotalCents = 0;

        foreach ($items as $item) {
            // Convert to cents immediately — work in integers only
            $unitPriceCents = (int) round($item['unit_price'] * 100);
            $qty = (int) $item['quantity'];
            $discountPct = (float) ($item['discount_pct'] ?? 0);

            // Line subtotal before item discount
            $lineRawCents = $unitPriceCents * $qty;

            // Item-level discount
            $lineDiscountCents = (int) round($lineRawCents * ($discountPct / 100));

            // Line total after item discount
            $lineTotalCents = $lineRawCents - $lineDiscountCents;

            $processedItems[] = [
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'],
                'product_sku' => $item['product_sku'] ?? null,
                'is_commissionable' => (bool) ($item['is_commissionable'] ?? true),
                'unit_price' => $this->money($unitPriceCents / 100),
                'quantity' => $qty,
                'discount_pct' => $discountPct,
                'line_discount_amount' => $this->money($lineDiscountCents / 100),
                'line_total' => $this->money($lineTotalCents / 100),
            ];

            $subtotalCents += $lineTotalCents;
        }

        // Cart-level discount applied to sum of all line totals
        $cartDiscountCents = (int) round($subtotalCents * ($cartDiscountPct / 100));
        $afterDiscountCents = $subtotalCents - $cartDiscountCents;

        // Tax applied after all discounts
        $taxCents = (int) round($afterDiscountCents * ($taxRate / 100));

        $totalCents = $afterDiscountCents + $taxCents;

        return [
            'items' => $processedItems,
            'subtotal' => $this->money($subtotalCents / 100),
            'discount_amount' => $this->money($cartDiscountCents / 100),
            'tax_amount' => $this->money($taxCents / 100),
            'total_amount' => $this->money($totalCents / 100),
        ];
    }

    /**
     * Calculate commission amount.
     *
     * Mode 'net'      = commission on (subtotal - discount)
     * Mode 'subtotal' = commission on subtotal before discount
     */
    public function calculateCommission(
        float $subtotal,
        float $discountAmount,
        float $commissionRate,
        string $mode = 'net'
    ): float {
        $baseCents = $mode === 'net'
            ? (int) round(($subtotal - $discountAmount) * 100)
            : (int) round($subtotal * 100);

        $commissionCents = (int) round($baseCents * ($commissionRate / 100));

        return $this->money($commissionCents / 100);
    }

    /**
     * Validate cart before processing.
     * Returns array of error messages (empty = valid).
     */
    public function validate(array $items): array
    {
        $errors = [];

        if (empty($items)) {
            $errors[] = 'Cart is empty.';
            return $errors;
        }

        foreach ($items as $index => $item) {
            $line = 'Item ' . ($index + 1);

            if (empty($item['product_id'])) {
                $errors[] = "$line: missing product_id";
            }
            if (empty($item['product_name'])) {
                $errors[] = "$line: missing product_name";
            }
            if (!isset($item['unit_price']) || $item['unit_price'] <= 0) {
                $errors[] = "$line: invalid unit_price";
            }
            if (!isset($item['quantity']) || $item['quantity'] < 1) {
                $errors[] = "$line: quantity must be at least 1";
            }
            if (isset($item['discount_pct']) && ($item['discount_pct'] < 0 || $item['discount_pct'] > 100)) {
                $errors[] = "$line: discount_pct must be between 0 and 100";
            }
        }

        return $errors;
    }
}
