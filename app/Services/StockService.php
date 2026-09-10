<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\StockLog;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * StockService
 *
 * The single point of truth for all stock movements in the system.
 * ALL stock IN / OUT operations MUST go through this service.
 * No controller or model should directly modify Inventory.current_stock.
 *
 * Why a Service instead of just a Controller?
 *   - In the future, POS sales, photography session logs, or automated alerts
 *     can all call this service without duplicating logic.
 *   - Keeping DB transaction + log creation + inventory update in one place
 *     prevents data inconsistencies.
 *
 * Workflow for every stock movement:
 *   1. Validate the request (quantity > 0, sufficient stock for OUT)
 *   2. Create a StockLog entry (the immutable audit record)
 *   3. Update Inventory.current_stock (increment or decrement)
 *   4. Return the updated Inventory record
 *
 * All operations are wrapped in a DB transaction to ensure atomicity —
 * if any step fails, the entire operation is rolled back cleanly.
 *
 * SHOP SCOPING:
 *   Every method requires a `$shopId` so stock for one shop can never
 *   leak into another. Inventory rows are looked up by the composite
 *   UNIQUE(variant_id, shop_id) and StockLog rows persist `shop_id` for
 *   per-shop audit trails.
 */
class StockService
{
    // ─────────────────────────────────────────────
    // Stock IN
    // ─────────────────────────────────────────────

    /**
     * Record a Stock IN transaction for a product variant in a specific shop.
     *
     * Use this when stock is received:
     *   e.g. New purchase from supplier, customer return, opening balance entry.
     *
     * @param  int         $shopId        Shop the stock is being received into.
     * @param  int         $variantId     ID of the ProductVariant receiving stock.
     * @param  int         $quantity      Number of units being added (positive).
     * @param  string      $reason        Human-readable reason e.g. "Purchase".
     * @param  string|null $date          Business date YYYY-MM-DD (defaults to today).
     * @param  float|null  $purchaseCost  Optional unit cost on this entry.
     * @param  float|null  $shippingCost  Optional shipping cost on this entry.
     * @param  float|null  $otherCost     Optional misc cost on this entry.
     * @param  string|null $notes         Optional free-text notes.
     * @return Inventory                  The refreshed Inventory snapshot.
     *
     * @throws InvalidArgumentException If quantity is not a positive integer.
     */
    public function recordIn(
        int $shopId,
        int $variantId,
        float $quantity,
        string $reason = 'Purchase',
        ?string $date = null,
        ?float $purchaseCost = null,
        ?float $shippingCost = null,
        ?float $otherCost = null,
        ?string $notes = null,
    ): Inventory {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Stock IN quantity must be a positive number.');
        }

        $date = $date ?? now()->toDateString();

        return DB::transaction(function () use ($shopId, $variantId, $quantity, $reason, $date, $purchaseCost, $shippingCost, $otherCost, $notes) {
            // Step 1: immutable audit log entry
            StockLog::create([
                'shop_id'       => $shopId,
                'variant_id'    => $variantId,
                'user_id'       => Auth::id(),
                'quantity'      => $quantity,
                'type'          => 'IN',
                'purchase_cost' => $purchaseCost,
                'shipping_cost' => $shippingCost,
                'other_cost'    => $otherCost,
                'reason'        => $reason,
                'notes'         => $notes,
                'date'          => $date,
            ]);

            // Step 2: increment the per-shop current stock snapshot
            $inventory = Inventory::query()
                ->where('variant_id', $variantId)
                ->where('shop_id', $shopId)
                ->firstOrFail();
            $inventory->increment('current_stock', $quantity);

            return $inventory->fresh();
        });
    }

    // ─────────────────────────────────────────────
    // Stock OUT
    // ─────────────────────────────────────────────

    /**
     * Record a Stock OUT transaction for a product variant in a specific shop.
     *
     * Use this when stock is consumed:
     *   e.g. Sale to customer, damaged goods, photography session usage, waste.
     *
     * @param  int         $shopId    Shop the stock is leaving from.
     * @param  int         $variantId Variant losing stock.
     * @param  int         $quantity  Units removed (positive).
     * @param  string      $reason    e.g. "Sale", "Damage".
     * @param  string|null $date      Business date YYYY-MM-DD (defaults to today).
     * @param  string|null $notes     Optional free-text notes.
     * @return Inventory              The refreshed Inventory snapshot.
     *
     * @throws InvalidArgumentException If quantity is not positive or stock insufficient.
     */
    public function recordOut(
        int $shopId,
        int $variantId,
        float $quantity,
        string $reason = 'Sale',
        ?string $date = null,
        ?string $notes = null,
    ): Inventory {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Stock OUT quantity must be a positive number.');
        }

        $date = $date ?? now()->toDateString();

        return DB::transaction(function () use ($shopId, $variantId, $quantity, $reason, $date, $notes) {
            // Lock the inventory row (per-shop) to prevent race conditions
            $inventory = Inventory::query()
                ->where('variant_id', $variantId)
                ->where('shop_id', $shopId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($inventory->current_stock < $quantity) {
                throw new InvalidArgumentException(
                    "Insufficient stock. Available: {$inventory->current_stock}, Requested: {$quantity}."
                );
            }

            StockLog::create([
                'shop_id'    => $shopId,
                'variant_id' => $variantId,
                'user_id'    => Auth::id(),
                'quantity'   => $quantity,
                'type'       => 'OUT',
                'reason'     => $reason,
                'notes'      => $notes,
                'date'       => $date,
            ]);

            $inventory->decrement('current_stock', $quantity);

            return $inventory->fresh();
        });
    }

    // ─────────────────────────────────────────────
    // Balance Query
    // ─────────────────────────────────────────────

    /**
     * Get the calculated balance for a variant from the audit trail,
     * scoped to a single shop. Should always equal the matching
     * inventory.current_stock; any drift indicates a data integrity issue.
     *
     * @param  int $shopId
     * @param  int $variantId
     * @return int  Net units in stock for that (variant, shop) pair.
     */
    public function getBalance(int $shopId, int $variantId): float
    {
        $in  = StockLog::query()
            ->where('shop_id', $shopId)
            ->where('variant_id', $variantId)
            ->where('type', 'IN')
            ->sum('quantity');
        $out = StockLog::query()
            ->where('shop_id', $shopId)
            ->where('variant_id', $variantId)
            ->where('type', 'OUT')
            ->sum('quantity');

        return (float) ($in - $out);
    }

    // ─────────────────────────────────────────────
    // Low Stock Alert Query
    // ─────────────────────────────────────────────

    /**
     * Get all inventory rows for a given shop where current_stock has
     * dropped below the row's low_stock_threshold. Drives dashboard alerts
     * and the sidebar low-stock badge.
     *
     * @param  int $shopId
     * @return Collection<int, Inventory>
     */
    public function getLowStockItems(int $shopId): Collection
    {
        return Inventory::query()
            ->with(['variant.product.category'])
            ->where('shop_id', $shopId)
            ->whereColumn('current_stock', '<', 'low_stock_threshold')
            ->get();
    }
}
