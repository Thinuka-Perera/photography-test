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
        Schema::table('inventory', function (Blueprint $table) {
            $table->decimal('current_stock', 10, 2)->change();
            $table->decimal('low_stock_threshold', 10, 2)->change();
        });

        Schema::table('stock_logs', function (Blueprint $table) {
            $table->decimal('quantity', 10, 2)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            $table->integer('current_stock')->change();
            $table->integer('low_stock_threshold')->change();
        });

        Schema::table('stock_logs', function (Blueprint $table) {
            $table->integer('quantity')->change();
        });
    }
};
