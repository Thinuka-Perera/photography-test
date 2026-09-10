<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quote_number', 30)->unique();
            $table->string('customer_name');
            $table->string('customer_phone', 30)->nullable();
            $table->string('event_type', 100);
            $table->date('event_date')->nullable();
            $table->string('package_name')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'awaiting_approval', 'approved', 'rejected'])->default('draft');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
