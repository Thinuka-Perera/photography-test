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
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->decimal('purchase_cost', 10, 2)->nullable()->after('type')->comment('Optional item cost when recording IN');
            $table->decimal('shipping_cost', 10, 2)->nullable()->after('purchase_cost')->comment('Optional shipping cost');
            $table->decimal('other_cost', 10, 2)->nullable()->after('shipping_cost')->comment('Optional other/misc cost');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->dropColumn(['purchase_cost', 'shipping_cost', 'other_cost']);
        });
    }
};
