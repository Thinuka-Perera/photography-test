<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update bill_counters to be shop-aware
        Schema::table('bill_counters', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_id')->nullable()->after('id');
            $table->dropUnique(['date']);
            $table->unique(['shop_id', 'date']);
        });

        // 2. Add shop_id to editor_commissions
        Schema::table('editor_commissions', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_id')->nullable()->after('id');
            $table->index('shop_id');
        });

        // Seed existing shop_id where possible (best effort)
        $defaultShopId = DB::table('shops')->orderBy('id')->value('id');
        if ($defaultShopId) {
            DB::table('bill_counters')->update(['shop_id' => $defaultShopId]);
            DB::table('editor_commissions')->update(['shop_id' => $defaultShopId]);
        }
    }

    public function down(): void
    {
        Schema::table('bill_counters', function (Blueprint $table) {
            $table->dropUnique(['shop_id', 'date']);
            $table->dropColumn('shop_id');
            $table->unique('date');
        });

        Schema::table('editor_commissions', function (Blueprint $table) {
            $table->dropColumn('shop_id');
        });
    }
};
