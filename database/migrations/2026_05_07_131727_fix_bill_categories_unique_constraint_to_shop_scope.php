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
        Schema::table('bill_categories', function (Blueprint $table) {
            // Drop the old global unique constraint on name
            $table->dropUnique(['name']);
            // Add composite unique constraint scoped to shop_id
            $table->unique(['shop_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bill_categories', function (Blueprint $table) {
            // Revert to old global unique constraint
            $table->dropUnique(['shop_id', 'name']);
            $table->unique(['name']);
        });
    }
};
