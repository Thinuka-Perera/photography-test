<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photography_packages', function (Blueprint $table) {
            // Replace client_name with category
            if (Schema::hasColumn('photography_packages', 'client_name')) {
                $table->dropIndex(['client_name']);
                $table->dropColumn('client_name');
            }

            if (!Schema::hasColumn('photography_packages', 'category')) {
                $table->string('category')->nullable()->after('name');
            }

            // Remove base_price and adjustment_amount if they exist
            if (Schema::hasColumn('photography_packages', 'base_price')) {
                $table->dropColumn('base_price');
            }

            if (Schema::hasColumn('photography_packages', 'adjustment_amount')) {
                $table->dropColumn('adjustment_amount');
            }

            // Add shop_id for shop isolation if it doesn't exist
            if (!Schema::hasColumn('photography_packages', 'shop_id')) {
                $table->unsignedBigInteger('shop_id')->nullable()->after('id');
                $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
            }
        });
    }

    public function down(): void
    {
        Schema::table('photography_packages', function (Blueprint $table) {
            if (Schema::hasColumn('photography_packages', 'category')) {
                $table->dropColumn('category');
            }

            if (!Schema::hasColumn('photography_packages', 'client_name')) {
                $table->string('client_name')->nullable()->after('name');
                $table->index('client_name');
            }

            if (!Schema::hasColumn('photography_packages', 'base_price')) {
                $table->decimal('base_price', 12, 2)->default(0)->after('deliverables');
            }

            if (!Schema::hasColumn('photography_packages', 'adjustment_amount')) {
                $table->decimal('adjustment_amount', 12, 2)->default(0)->after('base_price');
            }

            if (Schema::hasColumn('photography_packages', 'shop_id')) {
                $table->dropForeign(['shop_id']);
                $table->dropColumn('shop_id');
            }
        });
    }
};
