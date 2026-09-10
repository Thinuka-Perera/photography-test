<?php

namespace App\Contracts;

/**
 * InventoryServiceInterface
 *
 * Contract for adjusting per-shop stock counters when sellable units
 * are consumed (POS sale, photography session) or returned (refund).
 *
 * All methods are shop-scoped — the caller MUST pass the shop the
 * movement is happening in. Callers are typically `SaleService`,
 * `RefundController`, or any other domain service that ends up
 * mutating stock outside of the standard Stock IN / Stock OUT UI flow.
 */
interface InventoryServiceInterface
{
    /**
     * Decrement stock for a sellable unit in a specific shop.
     *
     * @param  int $shopId   The shop the stock is leaving from.
     * @param  int $variantId The product variant id.
     * @param  float $qty      Quantity to deduct (positive number).
     * @return void
     */
    public function deductStock(int $shopId, int $variantId, float $qty): void;

    /**
     * Increment stock for a sellable unit in a specific shop (e.g. refund).
     *
     * @param  int $shopId   The shop the stock is going back into.
     * @param  int $variantId The product variant id.
     * @param  float $qty      Quantity to restore (positive number).
     * @return void
     */
    public function restoreStock(int $shopId, int $variantId, float $qty): void;
}
