<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create Stock Logs Table
 *
 * This table is the AUDIT TRAIL of ALL stock movements in the system.
 * Every time stock goes IN or OUT for any variant, a new row is inserted here.
 * The inventory.current_stock is then updated by the StockService accordingly.
 *
 * This design follows the "immutable ledger" principle:
 *   - We NEVER delete or edit a stock log entry.
 *   - The balance at any point = SUM(IN quantities) - SUM(OUT quantities) for a given variant.
 *   - This lets the client ask "Where did these 10 frames go?" and always get an answer.
 *
 * Balance Formula:
 *   Balance = ∑(quantity WHERE type='IN') − ∑(quantity WHERE type='OUT')
 *
 * Common Reason Values:
 *   IN  → "Purchase", "Opening Balance", "Return from Customer", "Adjustment"
 *   OUT → "Sale", "Damage", "Photography Session Usage", "Adjustment"
 *
 * Relationships:
 *   - Belongs to one ProductVariant (product_variants table)
 *   - Belongs to one User (users table) — tracks who made the entry
 */
return new class extends Migration
{
    /**
     * Run the migration.
     * Creates the 'stock_logs' table with the following columns:
     *   - id          : Auto-incrementing primary key
     *   - variant_id  : Foreign key to the specific product variant this log entry belongs to.
     *                   Deleting a variant removes all its stock history (cascadeOnDelete)
     *   - user_id     : Foreign key to the user who recorded this transaction.
     *                   Deleting a user removes their log entries (cascadeOnDelete)
     *   - quantity    : The number of units moved. Always a POSITIVE integer.
     *                   The 'type' column determines if it adds or subtracts from stock.
     *   - type        : Enum — 'IN' means stock was added (purchase/return),
     *                          'OUT' means stock was removed (sale/usage/damage)
     *   - reason      : Human-readable label for why this movement happened.
     *                   e.g. "Purchase", "Sale", "Damage", "Photography Session"
     *   - date        : The actual business date this transaction occurred.
     *                   Stored separately from created_at to allow backdating entries.
     *   - created_at  : Timestamp when this log entry was inserted into the database
     *   - updated_at  : Timestamp of any edit to this log record (should rarely change)
     */
    public function up(): void
    {
        Schema::create('stock_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')
                  ->constrained('product_variants')
                  ->cascadeOnDelete();                        // Deleting a variant also removes its full stock history
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();                        // Tracks which staff member made this stock entry
            $table->integer('quantity');                      // Always positive — the 'type' column determines IN or OUT direction
            $table->enum('type', ['IN', 'OUT']);              // IN = stock added | OUT = stock removed
            $table->string('reason')->nullable();             // e.g. "Purchase", "Sale", "Damage", "Opening Balance"
            $table->date('date');                             // Business date of transaction (supports backdating, separate from created_at)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migration.
     * Drops the 'stock_logs' table if it exists.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_logs');
    }
};
