<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('editor_commissions', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('bill_id')->unique()->constrained()->cascadeOnDelete();
            // one commission record per bill — UNIQUE enforces this
            
            $table->unsignedBigInteger('editor_id');
            // who earned this commission (no FK — handled in service)
            
            $table->date('commission_date');
            // snapshot of bill created_at date (for monthly aggregation)
            
            $table->decimal('total_bill_amt', 10, 2);
            // full bill total (reference only — shows what commission was calculated on)
            
            $table->decimal('commissionable_amount', 10, 2);
            // CRITICAL: bill total MINUS items with category.no_commission = true
            // Example: 5000 bill with 500 passport (no_commission) = 4500 commissionable
            
            $table->decimal('commission_pct', 5, 2);
            // rate that was applied (snapshot)
            
            $table->decimal('commission_amt', 10, 2);
            // = commissionable_amount × pct / 100 (calculated server-side, immutable)
            
            $table->text('job_description')->nullable();
            // "12x15 collage, 4x6 single edit" — helps editor track what they did
            
            $table->boolean('is_paid')->default(false);
            $table->timestamp('paid_at')->nullable();
            
            $table->unsignedBigInteger('ledger_entry_id')->nullable()->unique();
            // FK to salary_ledger_entries.id (UNIQUE — prevents double-pay)
            // populated when commission is paid out via payroll
            
            $table->timestamps();

            $table->index('editor_id');
            $table->index('commission_date');
            $table->index('is_paid');
            $table->index('ledger_entry_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('editor_commissions');
    }
};
