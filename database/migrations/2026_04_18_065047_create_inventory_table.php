<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create Inventory Table
 *
 * This table acts as the "current stock snapshot" for each product variant.
 * It is a one-to-one companion to product_variants — every variant gets exactly
 * one inventory record created automatically when a variant is saved.
 *
 * IMPORTANT: The `current_stock` column is NEVER manually edited.
 * It is always updated by the StockService when a new stock_log entry (IN or OUT) is recorded:
 *   - Stock IN  → current_stock += quantity
 *   - Stock OUT → current_stock -= quantity
 *
 * The `low_stock_threshold` drives the low-stock alert badges in the UI.
 * When current_stock < low_stock_threshold, the item is flagged as "Low Stock".
 *
 * Relationships:
 *   - Belongs to one ProductVariant (product_variants table) — unique one-to-one link
 */
return new class extends Migration
{
    /**
     * Run the migration.
     * Creates the 'inventory' table with the following columns:
     *   - id                   : Auto-incrementing primary key
     *   - variant_id           : Foreign key to product_variants. UNIQUE — one inventory row per variant.
     *                            Deleting a variant deletes its inventory record (cascadeOnDelete)
     *   - current_stock        : The live running balance of this variant.
     *                            Calculated as: SUM(stock_in) - SUM(stock_out) via StockService
     *   - low_stock_threshold  : Alert threshold. When current_stock drops below this value,
     *                            the UI shows a red "Low Stock" badge. Default is 10 units.
     *   - created_at           : Timestamp when this inventory record was first created
     *   - updated_at           : Timestamp of the last stock movement (IN or OUT)
     */
    public function up(): void
    {
        Schema::create('inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')
                  ->unique()
                  ->constrained('product_variants')
                  ->cascadeOnDelete();                        // One inventory row per variant. Deleting variant cleans up inventory too
            $table->integer('current_stock')->default(0);    // Running balance — managed only by StockService, never directly edited
            $table->integer('low_stock_threshold')->default(10); // Triggers "Low Stock" alert in UI when current_stock < this value
            $table->timestamps();
        });
    }

    /**
     * Reverse the migration.
     * Drops the 'inventory' table if it exists.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
