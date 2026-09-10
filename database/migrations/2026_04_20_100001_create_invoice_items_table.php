<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();

            $table->string('description');
            // Human-readable item name (snapshot — product name at time of invoice)

            $table->unsignedBigInteger('product_id')->nullable();
            // Chamath's products table — loose ref (no cascade)
            // null = service or custom line item

            $table->string('product_sku', 100)->nullable();
            // Snapshot of SKU at invoice time

            $table->unsignedInteger('quantity')->default(1);

            $table->decimal('unit_price', 12, 2)->default(0);

            $table->decimal('discount_pct', 5, 2)->default(0);
            // Per-line discount percentage (e.g. 10.00 = 10%)

            $table->decimal('line_total', 12, 2)->default(0);
            // Computed: quantity * unit_price * (1 - discount_pct/100)

            $table->timestamps();

            $table->index('invoice_id');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};