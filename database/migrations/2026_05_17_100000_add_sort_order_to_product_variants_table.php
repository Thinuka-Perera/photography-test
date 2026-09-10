<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('product_id');
        });

        $orderByProduct = [];

        DB::table('product_variants')
            ->orderBy('product_id')
            ->orderBy('id')
            ->select(['id', 'product_id'])
            ->lazy()
            ->each(function ($row) use (&$orderByProduct) {
                $next = $orderByProduct[$row->product_id] ?? 0;
                DB::table('product_variants')
                    ->where('id', $row->id)
                    ->update(['sort_order' => $next]);
                $orderByProduct[$row->product_id] = $next + 1;
            });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
