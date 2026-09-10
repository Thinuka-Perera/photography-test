<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->after('quotation_id');
            $table->string('product_sku', 100)->nullable()->after('product_id');

            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->dropIndex(['product_id']);
            $table->dropColumn(['product_id', 'product_sku']);
        });
    }
};
