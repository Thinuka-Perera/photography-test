<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Safety for environments where an earlier failed migration attempt
        // left a partially-created sale_items table behind.
        Schema::dropIfExists('sale_items');

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            // sales EXISTS in this migration batch — safe FK

            $table->unsignedBigInteger('product_id');
            // NO FK — Chamath's products table doesn't exist yet

            $table->string('product_name');
            $table->string('product_sku')->nullable();
            // SNAPSHOT columns — store name/sku at time of sale
            // Critical: if Chamath renames a product later, receipt still shows original

            $table->decimal('unit_price', 10, 2);
            // SNAPSHOT — price at time of sale, not live price

            $table->unsignedInteger('quantity');

            $table->decimal('discount_pct', 5, 2)->default(0.00);
            // Per-item discount percentage (0.00 to 100.00)

            $table->decimal('line_discount_amount', 10, 2)->default(0.00);
            // Stored computed discount value: unit_price * qty * (discount_pct / 100)
            // Avoids recalculation in reports — query-ready

            $table->decimal('line_total', 10, 2);
            // Stored computed value: (unit_price * qty) * (1 - discount_pct/100)
            // Stored so reports never need to recompute

            $table->timestamps();

            // Index — frequent filter: items by product for sales reports
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};