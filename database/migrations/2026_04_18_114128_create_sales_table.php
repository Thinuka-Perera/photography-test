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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();

            $table->string('sale_number', 30)->unique();
            // Format: SALE-20260418-0001
            // Length 30 — future-proof against longer formats
            // Generated in SaleService, not DB — gives us full control

            $table->unsignedBigInteger('customer_id')->nullable();
            // NO FK yet — Sandaru's customers table doesn't exist
            // nullable = walk-in customers allowed

            $table->foreignId('cashier_id')->constrained('users');
            // users table EXISTS (Laravel default) — safe to FK

            $table->unsignedBigInteger('editor_id')->nullable();
            // Who actually processed/edited the sale (may differ from cashier)
            // NO FK — avoids dependency issues; linked manually in service layer

            $table->decimal('subtotal', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('tax_amount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);
            // All DECIMAL(10,2) — never FLOAT for money

            // Commission fields — all snapshots stored at time of sale
            $table->decimal('commission_rate', 5, 2)->default(0.00);
            // Snapshot of the rate applied (e.g. 5.00 = 5%)

            $table->decimal('commission_amount', 10, 2)->default(0.00);
            // Snapshot: commission_base * commission_rate / 100
            // commission_base = subtotal - discount_amount

            $table->enum('commission_mode', ['subtotal', 'net'])->default('net');
            // 'net'      = commission on (subtotal - discount_amount) ← your decided logic
            // 'subtotal' = commission on raw subtotal (kept for audit flexibility)
            // Stored as snapshot — audit-proof even if admin changes mode later

            $table->enum('status', [
                'pending',
                'completed',
                'cancelled',
                'refunded',
                'partially_refunded',
            ])->default('pending');
            // pending   = payment not confirmed yet
            // completed = payment done, stock deducted

            $table->text('notes')->nullable();

            $table->timestamps();

            // Indexes — critical for production query performance
            $table->index('customer_id');
            $table->index('cashier_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
