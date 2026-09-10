<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $defaultShopId = DB::table('shops')->where('is_default', true)->value('id') 
                      ?? DB::table('shops')->value('id');

        $tables = [
            'bills'                => 'bill_number',
            'credit_bills'         => 'id',
            'photography_packages' => 'name',
            'bill_categories'      => 'name',
            'events'               => 'title',
        ];

        foreach ($tables as $table => $afterColumn) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'shop_id')) {
                Schema::table($table, function (Blueprint $table) use ($afterColumn) {
                    $table->foreignId('shop_id')->nullable()->after($afterColumn)->constrained('shops')->cascadeOnDelete();
                });

                if ($defaultShopId) {
                    DB::table($table)->whereNull('shop_id')->update(['shop_id' => $defaultShopId]);
                }
                
                Schema::table($table, function (Blueprint $table) {
                    $table->unsignedBigInteger('shop_id')->nullable(false)->change();
                });
            }
        }
    }

    public function down(): void
    {
        $tables = ['bills', 'credit_bills', 'photography_packages'];
        foreach ($tables as $table) {
            if (Schema::hasColumn($table, 'shop_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropForeign(['shop_id']);
                    $table->dropColumn('shop_id');
                });
            }
        }
    }
};
