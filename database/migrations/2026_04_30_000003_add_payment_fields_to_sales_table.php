<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (! Schema::hasColumn('sales', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('customer_id');
            }

            if (! Schema::hasColumn('sales', 'customer_phone')) {
                $table->string('customer_phone')->nullable()->after('customer_name');
            }

            if (! Schema::hasColumn('sales', 'reference_number')) {
                $table->string('reference_number')->nullable()->after('customer_phone');
            }

            if (! Schema::hasColumn('sales', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('reference_number');
            }

            if (! Schema::hasColumn('sales', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('bank_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'payment_method')) {
                $table->dropColumn('payment_method');
            }

            if (Schema::hasColumn('sales', 'bank_name')) {
                $table->dropColumn('bank_name');
            }

            if (Schema::hasColumn('sales', 'reference_number')) {
                $table->dropColumn('reference_number');
            }

            if (Schema::hasColumn('sales', 'customer_phone')) {
                $table->dropColumn('customer_phone');
            }

            if (Schema::hasColumn('sales', 'customer_name')) {
                $table->dropColumn('customer_name');
            }
        });
    }
};