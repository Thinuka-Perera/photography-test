<?php

namespace App\Services;

use App\Contracts\InventoryServiceInterface;
use App\Exceptions\InsufficientStockException;
use App\Models\Inventory;
use App\Models\StockLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/**
 * InventoryService
 *
 * Implements stock adjustments for sale/refund flows. Unlike StockService
 * (which is the canonical entry point for the inventory UI), this service
 * is consumed by SaleService and RefundController where stock changes
 * are a side-effect of another business action.
 *
 * SHOP SCOPING: every public method requires a `$shopId` so each shop's
 * stock counter and audit trail stay isolated. The shop id is typically
 * the active shop resolved by ActiveShopResolver and forwarded by the
 * caller. The internal stock_logs row also persists `shop_id` for audit.
 */
class InventoryService implements InventoryServiceInterface
{
    /**
     * Deduct stock for a sellable unit in a specific shop.
     *
     * @param  int $shopId
     * @param  int $variantId
     * @param  int $qty
     * @return void
     *
     * @throws InsufficientStockException
     */
    public function deductStock(int $shopId, int $variantId, float $qty): void
    {
        if ($qty <= 0) {
            throw new InvalidArgumentException('Stock deduction quantity must be greater than zero.');
        }

        try {
            $this->withinTransaction(function () use ($shopId, $variantId, $qty) {
                $inventory = Inventory::query()
                    ->where('variant_id', $variantId)
                    ->where('shop_id', $shopId)
                    ->lockForUpdate()
                    ->first();

                $available = (float) ($inventory?->current_stock ?? 0);

                if (!$inventory || $available < $qty) {
                    throw new InsufficientStockException($variantId, $qty, $available);
                }

                $inventory->decrement('current_stock', $qty);

                $this->recordStockLog(
                    shopId:    $shopId,
                    variantId: $variantId,
                    quantity:  $qty,
                    type:      'OUT',
                    reason:    'POS Sale',
                );
            });
        } catch (\Throwable $e) {
            Log::error('Inventory deduction failed', [
                'shop_id'    => $shopId,
                'variant_id' => $variantId,
                'quantity'   => $qty,
                'message'    => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Restore stock for a sellable unit in a specific shop.
     *
     * @param  int $shopId
     * @param  int $variantId
     * @param  int $qty
     * @return void
     */
    public function restoreStock(int $shopId, int $variantId, float $qty): void
    {
        if ($qty <= 0) {
            throw new InvalidArgumentException('Stock restoration quantity must be greater than zero.');
        }

        try {
            $this->withinTransaction(function () use ($shopId, $variantId, $qty) {
                $inventory = Inventory::query()
                    ->where('variant_id', $variantId)
                    ->where('shop_id', $shopId)
                    ->lockForUpdate()
                    ->first();

                if (!$inventory) {
                    throw new RuntimeException("Inventory row not found for variant #{$variantId} in shop #{$shopId}.");
                }

                $inventory->increment('current_stock', $qty);

                $this->recordStockLog(
                    shopId:    $shopId,
                    variantId: $variantId,
                    quantity:  $qty,
                    type:      'IN',
                    reason:    'Refund Restock',
                );
            });
        } catch (\Throwable $e) {
            Log::error('Inventory restore failed', [
                'shop_id'    => $shopId,
                'variant_id' => $variantId,
                'quantity'   => $qty,
                'message'    => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Ensure lockForUpdate operates inside a transaction. Reuses the
     * caller's existing transaction when present (typical for SaleService).
     *
     * @param  callable $callback
     * @return void
     */
    private function withinTransaction(callable $callback): void
    {
        if (DB::transactionLevel() > 0) {
            $callback();
            return;
        }

        DB::transaction(function () use ($callback) {
            $callback();
        });
    }

    /**
     * Append an immutable stock movement log entry.
     *
     * @param  int    $shopId
     * @param  int    $variantId
     * @param  int    $quantity
     * @param  string $type   'IN' | 'OUT'
     * @param  string $reason
     * @return void
     */
    private function recordStockLog(int $shopId, int $variantId, float $quantity, string $type, string $reason): void
    {
        if (!Schema::hasTable('stock_logs')) {
            return;
        }

        $userId = Auth::id() ?? DB::table('users')->value('id');

        if (!$userId) {
            // When no authenticated user exists (e.g. during early seeding or background
            // jobs), we skip creating the immutable StockLog rather than throwing an
            // exception which would break the caller's transaction. The inventory
            // quantity change itself is still performed above; skipping the log is
            // preferable to crashing the operation. A warning is emitted to help
            // operators notice missing audit entries in unusual environments.
            Log::warning('No user available to record stock movement log; skipping log entry.', [
                'shop_id' => $shopId,
                'variant_id' => $variantId,
                'quantity' => $quantity,
                'type' => $type,
                'reason' => $reason,
            ]);

            return;
        }

        StockLog::query()->create([
            'shop_id'    => $shopId,
            'variant_id' => $variantId,
            'user_id'    => $userId,
            'quantity'   => $quantity,
            'type'       => $type,
            'reason'     => $reason,
            'date'       => now()->toDateString(),
        ]);
    }
}
