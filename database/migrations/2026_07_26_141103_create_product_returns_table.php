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
        Schema::create('product_returns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id')->index();
            $table->string('return_number')->unique();
            $table->unsignedBigInteger('sale_id')->nullable()->index();
            $table->unsignedBigInteger('invoice_id')->nullable()->index();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->decimal('total_amount', 10, 2);
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('processed_by')->index();
            $table->string('status')->default('completed');
            $table->timestamps();
        });

        Schema::create('product_return_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_return_id')->index();
            $table->unsignedBigInteger('product_id')->index(); // Variant ID representable in POS / Invoice
            $table->string('product_name');
            $table->string('product_sku')->nullable();
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
            $table->timestamps();

            $table->foreign('product_return_id')
                ->references('id')
                ->on('product_returns')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_return_items');
        Schema::dropIfExists('product_returns');
    }
};
