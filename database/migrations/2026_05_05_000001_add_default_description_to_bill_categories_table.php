<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('bill_categories')) {
            return;
        }

        Schema::table('bill_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('bill_categories', 'default_description')) {
                $table->string('default_description')->nullable()->after('name');
            }

            // Safety: some older DBs may not have this column.
            if (!Schema::hasColumn('bill_categories', 'no_commission')) {
                $table->boolean('no_commission')->default(false)->after('default_description');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('bill_categories')) {
            return;
        }

        Schema::table('bill_categories', function (Blueprint $table) {
            if (Schema::hasColumn('bill_categories', 'default_description')) {
                $table->dropColumn('default_description');
            }

            // Intentionally do not drop `no_commission` here unless it was missing.
            // It existed in the original migration for this project.
        });
    }
};
