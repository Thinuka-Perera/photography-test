<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('credit_bills')) {
            Schema::create('credit_bills', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
                $table->enum('type', ['credit', 'advance']);
                $table->string('customer_name')->nullable();
                $table->string('customer_phone')->nullable();
                $table->decimal('total_amount', 10, 2);
                $table->decimal('paid_amount', 10, 2)->default(0);
                $table->decimal('balance_amount', 10, 2);
                $table->foreignId('created_by')->constrained('employees')->cascadeOnDelete();
                $table->date('promise_date');
                $table->enum('status', ['outstanding', 'settled'])->default('outstanding');
                $table->date('settled_date')->nullable();
                $table->foreignId('settled_by')->nullable()->constrained('employees')->nullOnDelete();
                $table->timestamps();

                $table->index(['type', 'status']);
                $table->index('promise_date');
            });

            return;
        }

        Schema::table('credit_bills', function (Blueprint $table) {
            if (! Schema::hasColumn('credit_bills', 'sale_id')) {
                $table->foreignId('sale_id')->after('id')->constrained('sales')->cascadeOnDelete();
            }

            if (! Schema::hasColumn('credit_bills', 'type')) {
                $table->enum('type', ['credit', 'advance'])->after('sale_id');
            }

            if (! Schema::hasColumn('credit_bills', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('type');
            }

            if (! Schema::hasColumn('credit_bills', 'customer_phone')) {
                $table->string('customer_phone')->nullable()->after('customer_name');
            }

            if (! Schema::hasColumn('credit_bills', 'total_amount')) {
                $table->decimal('total_amount', 10, 2)->after('customer_phone');
            }

            if (! Schema::hasColumn('credit_bills', 'paid_amount')) {
                $table->decimal('paid_amount', 10, 2)->default(0)->after('total_amount');
            }

            if (! Schema::hasColumn('credit_bills', 'balance_amount')) {
                $table->decimal('balance_amount', 10, 2)->after('paid_amount');
            }

            if (! Schema::hasColumn('credit_bills', 'created_by')) {
                $table->foreignId('created_by')->after('balance_amount')->constrained('employees')->cascadeOnDelete();
            }

            if (! Schema::hasColumn('credit_bills', 'promise_date')) {
                $table->date('promise_date')->after('created_by');
            }

            if (! Schema::hasColumn('credit_bills', 'status')) {
                $table->enum('status', ['outstanding', 'settled'])->default('outstanding')->after('promise_date');
            }

            if (! Schema::hasColumn('credit_bills', 'settled_date')) {
                $table->date('settled_date')->nullable()->after('status');
            }

            if (! Schema::hasColumn('credit_bills', 'settled_by')) {
                $table->foreignId('settled_by')->nullable()->after('settled_date')->constrained('employees')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_bills');
    }
};