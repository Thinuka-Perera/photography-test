<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create Product Variants Table
 *
 * This table stores the specific, sellable combinations of a product.
 * Each row represents ONE unique item that can be stocked and sold.
 *
 * Example of how variants relate to a parent product:
 *   Product: "Photo Frame"
 *     ├── Variant: size=4x6,  grade_type=A  → SKU: FRM-4X6-GRA-A
 *     ├── Variant: size=4x6,  grade_type=B  → SKU: FRM-4X6-GRA-B
 *     └── Variant: size=8x10, grade_type=A  → SKU: FRM-8X10-GRA-A
 *
 * SKU Generation Logic (handled in ProductVariant Model):
 *   Format: [CATEGORY_PREFIX]-[SIZE]-GRA-[GRADE]
 *   e.g.    FRM-4X6-GRA-A
 *   The SKU is auto-generated on create but can be manually overridden by the user.
 *
 * Barcode Logic:
 *   Generated automatically when a variant is created.
 *   The user can regenerate it at any time from the UI.
 *
 * Relationships:
 *   - Belongs to one Product (products table)
 *   - Has one Inventory record (inventory table) — tracks current stock level
 *   - Has many StockLogs (stock_logs table)    — full IN/OUT audit trail
 */
return new class extends Migration
{
    /**
     * Run the migration.
     * Creates the 'product_variants' table with the following columns:
     *   - id             : Auto-incrementing primary key
     *   - product_id     : Foreign key to the parent product. Deleting a product deletes all its variants (cascadeOnDelete)
     *   - size           : Physical size label (e.g. "4x6", "8x10", "A4"). Nullable for general items without sizes
     *   - grade_type     : Quality grade or machine type label (e.g. "A", "B", "C", "Epson P7000"). Nullable
     *   - sku            : Unique Stock Keeping Unit code (auto-generated, editable by user)
     *   - barcode        : Barcode string used for label printing (auto-generated, regeneratable by user)
     *   - cost_price     : Purchase/cost price per unit in LKR
     *   - selling_price  : Retail/selling price per unit in LKR
     *   - created_at     : Timestamp when this variant was first created
     *   - updated_at     : Timestamp of the last update to this variant record
     */
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')
                  ->constrained('products')
                  ->cascadeOnDelete();                       // Deleting a product removes all its variants automatically
            $table->string('size')->nullable();              // Physical size (e.g. 4x6, 8x10, A4). Null for general items
            $table->string('grade_type')->nullable();        // Quality grade (A/B/C) or machine compatibility label
            $table->string('sku')->unique();                 // Auto-generated, globally unique identifier for this variant
            $table->string('barcode')->nullable();           // Barcode value used for printing/scanning. Auto-generated on create
            $table->decimal('cost_price', 10, 2)->default(0);    // Cost to purchase/manufacture — used in profit reports
            $table->decimal('selling_price', 10, 2)->default(0); // Price charged to the customer
            $table->timestamps();
        });
    }

    /**
     * Reverse the migration.
     * Drops the 'product_variants' table if it exists.
     * Note: All related 'inventory' and 'stock_logs' records will also be deleted
     * due to cascadeOnDelete on their respective FKs.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
