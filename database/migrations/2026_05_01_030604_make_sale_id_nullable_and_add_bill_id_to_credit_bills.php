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
        Schema::table('credit_bills', function (Blueprint $table) {
            $table->unsignedBigInteger('sale_id')->nullable()->change();

            if (! Schema::hasColumn('credit_bills', 'bill_id')) {
                $table->unsignedBigInteger('bill_id')->nullable()->after('sale_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('credit_bills', function (Blueprint $table) {
            $table->unsignedBigInteger('sale_id')->nullable(false)->change();
            // Only drop bill_id if it was added by this migration (i.e. the earlier
            // migration that owns bill_id has already been rolled back first).
        });
    }
};
