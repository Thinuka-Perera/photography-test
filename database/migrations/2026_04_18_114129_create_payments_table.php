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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();

            $table->enum('method', ['cash', 'card'])->default('cash');
            // Split payment = TWO rows in this table, same sale_id
            // e.g. cash 500 + card 300 for an 800 total

            $table->decimal('amount', 10, 2);

            $table->string('reference_no')->nullable();
            // Card terminal transaction ID
            // Leave null for cash

            $table->string('gateway')->nullable();
            // Payment gateway identifier — e.g. 'stripe', 'payhere', 'manual'
            // null for cash; populated by gateway handler in PaymentService

            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            // pending   = waiting for gateway confirmation
            // completed = confirmed
            // failed    = gateway declined

            $table->timestamp('confirmed_at')->nullable();
            // Set when status → completed

            $table->timestamps();

            // Indexes — frequent filters in payment reconciliation queries
            $table->index('sale_id');
            $table->index('method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
