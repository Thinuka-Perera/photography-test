<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bill_items', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('bill_id')->constrained()->cascadeOnDelete();
            
            $table->unsignedBigInteger('category_id')->nullable();
            // FK to bill_categories (optional — items can be uncategorized)
            
            $table->unsignedBigInteger('pos_tab_id')->nullable();
            // which POS tab was this item added from (for audit)
            
            $table->boolean('is_stock_item')->default(false);
            // true = linked to inventory.id, should deduct stock on bill complete
            // false = manually typed item, no inventory impact
            
            $table->unsignedBigInteger('stock_item_id')->nullable();
            // FK to inventory if is_stock_item = true
            
            $table->string('description', 255);
            // auto-filled from inventory if stock_item_id is set
            // but always editable (user can override name)
            
            $table->decimal('quantity', 10, 2);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
            // = quantity × unit_price
            
            $table->timestamps();

            $table->index('bill_id');
            $table->index('category_id');
            $table->index('is_stock_item');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_items');
    }
};
