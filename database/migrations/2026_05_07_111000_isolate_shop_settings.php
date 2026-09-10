<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaultShopId = DB::table('shops')->where('is_default', true)->value('id') 
                      ?? DB::table('shops')->value('id');

        if (Schema::hasTable('shop_settings') && !Schema::hasColumn('shop_settings', 'shop_id')) {
            // First, make the unique index non-unique so we can have the same key for different shops
            Schema::table('shop_settings', function (Blueprint $table) {
                $table->dropUnique(['key']);
            });

            Schema::table('shop_settings', function (Blueprint $table) {
                $table->foreignId('shop_id')->nullable()->after('id')->constrained('shops')->cascadeOnDelete();
            });

            if ($defaultShopId) {
                DB::table('shop_settings')->update(['shop_id' => $defaultShopId]);
            }

            Schema::table('shop_settings', function (Blueprint $table) {
                $table->unsignedBigInteger('shop_id')->nullable(false)->change();
                $table->unique(['shop_id', 'key']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('shop_settings')) {
            Schema::table('shop_settings', function (Blueprint $table) {
                $table->dropUnique(['shop_id', 'key']);
                $table->dropForeign(['shop_id']);
                $table->dropColumn('shop_id');
                $table->unique('key');
            });
        }
    }
};
