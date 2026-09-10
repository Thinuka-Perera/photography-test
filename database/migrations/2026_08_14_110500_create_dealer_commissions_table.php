<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dealer_commissions', function (Blueprint $table) {
            $table->id();
            
            $table->unsignedBigInteger('shop_id')->nullable();
            $table->foreignId('bill_id')->unique()->constrained()->cascadeOnDelete();
            
            $table->unsignedBigInteger('dealer_id');
            $table->date('commission_date');
            
            $table->decimal('total_bill_amt', 10, 2);
            $table->decimal('commissionable_amount', 10, 2);
            $table->decimal('commission_pct', 5, 2);
            $table->decimal('commission_amt', 10, 2);
            
            $table->boolean('is_paid')->default(false);
            $table->timestamp('paid_at')->nullable();
            
            $table->unsignedBigInteger('ledger_entry_id')->nullable()->unique();
            
            $table->timestamps();

            $table->index('shop_id');
            $table->index('dealer_id');
            $table->index('commission_date');
            $table->index('is_paid');
            $table->index('ledger_entry_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dealer_commissions');
    }
};
