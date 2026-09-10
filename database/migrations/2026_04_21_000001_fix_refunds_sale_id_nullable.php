<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FIX: Make sale_id nullable on refunds table.
 *
 * ROOT CAUSE of "Refund could not be processed":
 *   The original refunds migration created sale_id as a NOT NULL foreign key:
 *     $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
 *
 *   Invoice-originated refunds have no sale_id (they come from the invoices module,
 *   not from the POS). When InvoiceService tries to save sale_id = null, MySQL
 *   throws a constraint violation, which Laravel catches as a generic \Throwable
 *   and returns "Refund could not be processed. Please try again."
 *
 * FIX: Change sale_id to nullable so invoice refunds can be saved without a sale.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            // Drop the existing foreign key constraint first
            $table->dropForeign(['sale_id']);

            // Change sale_id to nullable
            $table->unsignedBigInteger('sale_id')->nullable()->change();

            // Re-add the foreign key as nullable
            $table->foreign('sale_id')->references('id')->on('sales')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropForeign(['sale_id']);
            $table->unsignedBigInteger('sale_id')->nullable(false)->change();
            $table->foreign('sale_id')->references('id')->on('sales')->cascadeOnDelete();
        });
    }
};