<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            if (! Schema::hasColumn('bills', 'dealer_id')) {
                $table->unsignedBigInteger('dealer_id')->nullable()->after('editor_id');
                $table->index('dealer_id');
            }
            if (! Schema::hasColumn('bills', 'dealer_commission_pct')) {
                $table->decimal('dealer_commission_pct', 5, 2)->nullable()->after('commission_pct');
            }
            if (! Schema::hasColumn('bills', 'is_dealer_commission_applicable')) {
                $table->boolean('is_dealer_commission_applicable')->default(true)->after('is_commission_applicable');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            if (Schema::hasColumn('bills', 'dealer_id')) {
                $table->dropColumn('dealer_id');
            }
            if (Schema::hasColumn('bills', 'dealer_commission_pct')) {
                $table->dropColumn('dealer_commission_pct');
            }
            if (Schema::hasColumn('bills', 'is_dealer_commission_applicable')) {
                $table->dropColumn('is_dealer_commission_applicable');
            }
        });
    }
};
