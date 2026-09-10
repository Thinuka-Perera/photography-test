<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('credit_payments')) {
            Schema::create('credit_payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('credit_bill_id')->constrained('credit_bills')->cascadeOnDelete();
                $table->decimal('amount', 10, 2);
                $table->string('payment_method');
                $table->string('reference_number')->nullable();
                $table->string('bank_name')->nullable();
                $table->foreignId('created_by')->constrained('employees')->cascadeOnDelete();
                $table->timestamps();

                $table->index('credit_bill_id');
                $table->index('payment_method');
            });

            return;
        }

        Schema::table('credit_payments', function (Blueprint $table) {
            if (! Schema::hasColumn('credit_payments', 'credit_bill_id')) {
                $table->foreignId('credit_bill_id')->after('id')->constrained('credit_bills')->cascadeOnDelete();
            }

            if (! Schema::hasColumn('credit_payments', 'amount')) {
                $table->decimal('amount', 10, 2)->after('credit_bill_id');
            }

            if (! Schema::hasColumn('credit_payments', 'payment_method')) {
                $table->string('payment_method')->after('amount');
            }

            if (! Schema::hasColumn('credit_payments', 'reference_number')) {
                $table->string('reference_number')->nullable()->after('payment_method');
            }

            if (! Schema::hasColumn('credit_payments', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('reference_number');
            }

            if (! Schema::hasColumn('credit_payments', 'created_by')) {
                $table->foreignId('created_by')->after('bank_name')->constrained('employees')->cascadeOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_payments');
    }
};