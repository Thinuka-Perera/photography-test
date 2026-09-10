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
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();

            $table->unsignedBigInteger('invoice_id')->nullable();
            // NO FK — Thinuka's invoices table doesn't exist yet
            // Will be linked once his module is ready

            $table->decimal('amount', 10, 2);

            $table->enum('type', ['full', 'partial'])->default('partial');
            // 'full'    = entire sale amount refunded → sale status → 'refunded'
            // 'partial' = part of sale refunded → sale status → 'partially_refunded'
            // Critical for reporting UI and status transitions

            $table->text('reason')->nullable();

            $table->foreignId('processed_by')->constrained('users');
            // Who processed the refund (must be logged-in user)

            $table->enum('status', ['pending', 'completed'])->default('pending');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
