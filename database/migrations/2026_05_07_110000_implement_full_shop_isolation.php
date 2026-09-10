<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Get default shop ID for backfilling
        $defaultShopId = DB::table('shops')->where('is_default', true)->value('id') 
                      ?? DB::table('shops')->value('id');

        // 2. Add shop_id to missing financial and customer tables
        $tables = [
            'sales'      => 'sale_number',
            'invoices'   => 'invoice_number',
            'quotations' => 'quote_number',
            'refunds'    => 'id',
            'customers'  => 'id',
        ];

        foreach ($tables as $table => $afterColumn) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'shop_id')) {
                Schema::table($table, function (Blueprint $table) use ($afterColumn) {
                    $table->foreignId('shop_id')->nullable()->after($afterColumn)->constrained('shops')->cascadeOnDelete();
                });

                // Backfill
                if ($defaultShopId) {
                    DB::table($table)->whereNull('shop_id')->update(['shop_id' => $defaultShopId]);
                }
                
                // Set to Not Null
                Schema::table($table, function (Blueprint $table) {
                    $table->unsignedBigInteger('shop_id')->nullable(false)->change();
                });
            }
        }

        // 3. Create shop_user pivot table for granular access control
        if (!Schema::hasTable('shop_user')) {
            Schema::create('shop_user', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
                $table->timestamps();
                
                $table->unique(['user_id', 'shop_id']);
            });
        }

        // 4. Backfill shop_user: Give all existing users access to the default shop
        if ($defaultShopId) {
            $users = DB::table('users')->get();
            foreach ($users as $user) {
                DB::table('shop_user')->insertOrIgnore([
                    'user_id' => $user->id,
                    'shop_id' => $defaultShopId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_user');

        $tables = ['sales', 'invoices', 'quotations', 'refunds', 'customers'];
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
