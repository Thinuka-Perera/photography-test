<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('bills')) {
            return;
        }

        Schema::table('bills', function (Blueprint $table) {
            if (!Schema::hasColumn('bills', 'customer_id')) {
                $table->unsignedBigInteger('customer_id')->nullable()->after('payment_method');
                $table->index('customer_id');
            }

            if (!Schema::hasColumn('bills', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('customer_id');
            }

            if (!Schema::hasColumn('bills', 'customer_phone')) {
                $table->string('customer_phone', 30)->nullable()->after('customer_name');
            }

            if (!Schema::hasColumn('bills', 'reference_number')) {
                $table->string('reference_number')->nullable()->after('customer_phone');
            }

            if (!Schema::hasColumn('bills', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('reference_number');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('bills')) {
            return;
        }

        Schema::table('bills', function (Blueprint $table) {
            if (Schema::hasColumn('bills', 'bank_name')) {
                $table->dropColumn('bank_name');
            }

            if (Schema::hasColumn('bills', 'reference_number')) {
                $table->dropColumn('reference_number');
            }

            if (Schema::hasColumn('bills', 'customer_phone')) {
                $table->dropColumn('customer_phone');
            }

            if (Schema::hasColumn('bills', 'customer_name')) {
                $table->dropColumn('customer_name');
            }

            if (Schema::hasColumn('bills', 'customer_id')) {
                $table->dropIndex(['customer_id']);
                $table->dropColumn('customer_id');
            }
        });
    }
};
