<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employees') || ! Schema::hasTable('shops')) {
            return;
        }

        if (! Schema::hasColumn('employees', 'shop_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->foreignId('shop_id')->nullable()->after('id')->constrained('shops')->cascadeOnDelete();
            });
        }

        $defaultShopId = DB::table('shops')->where('is_default', true)->value('id')
            ?? DB::table('shops')->orderBy('id')->value('id');

        if ($defaultShopId) {
            DB::table('employees')->whereNull('shop_id')->update(['shop_id' => $defaultShopId]);
        }

        if (Schema::hasColumn('employees', 'shop_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->unsignedBigInteger('shop_id')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('employees', 'shop_id')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['shop_id']);
            $table->dropColumn('shop_id');
        });
    }
};
