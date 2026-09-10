<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create Products Table
 *
 * This table stores the base/parent product definitions.
 * A product is a logical grouping — for example "Photo Frame" is ONE product,
 * but it will have many variants under product_variants (e.g. 4x6 Grade A, 8x10 Grade B).
 *
 * Design Principle:
 *   DO NOT create a separate product for every size/grade combination.
 *   Instead, use ONE product + many variants pattern to keep the system scalable.
 *
 * Relationships:
 *   - Belongs to one Category (categories table)
 *   - Has many ProductVariants (product_variants table)
 */
return new class extends Migration
{
    /**
     * Run the migration.
     * Creates the 'products' table with the following columns:
     *   - id           : Auto-incrementing primary key
     *   - name         : Base product name (e.g. "Photo Frame", "Cyan Ink Cartridge")
     *   - category_id  : Foreign key linking to categories. Deleting a category deletes all its products (cascadeOnDelete)
     *   - description  : Optional long-form description of the product
     *   - uom          : Unit of Measure — how this product is counted (e.g. "sheet", "unit", "bottle", "roll")
     *   - metadata     : JSON column for flexible extra data. Used to store machine-specific ink info:
     *                    e.g. {"compatible_machines": ["Epson P7000", "L18050"], "colors": 6}
     *   - created_at   : Timestamp when the product was first added
     *   - updated_at   : Timestamp of the last update to the product record
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');                                              // Base product name, shared across all variants
            $table->foreignId('category_id')
                  ->constrained('categories')
                  ->cascadeOnDelete();                                           // Deleting a category removes all linked products
            $table->text('description')->nullable();                             // Optional product notes or specs
            $table->string('uom')->default('unit');                              // Unit of measure: sheet, bottle, unit, roll, etc.
            $table->json('metadata')->nullable();                                // Flexible JSON for machine compatibility, color counts, etc.
            $table->timestamps();
        });
    }

    /**
     * Reverse the migration.
     * Drops the 'products' table if it exists.
     * Note: All related 'product_variants' records will also be deleted due to cascadeOnDelete on their FK.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
