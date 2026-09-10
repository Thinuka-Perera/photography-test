<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salary_ledger_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('salary_ledger_entries', 'sale_id')) {
                $table->foreignId('sale_id')->nullable()->after('salary_profile_id')->constrained('sales')->nullOnDelete();
            }

            if (! Schema::hasColumn('salary_ledger_entries', 'period')) {
                $table->date('period')->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('salary_ledger_entries', function (Blueprint $table) {
            if (Schema::hasColumn('salary_ledger_entries', 'period')) {
                $table->dropColumn('period');
            }

            if (Schema::hasColumn('salary_ledger_entries', 'sale_id')) {
                $table->dropConstrainedForeignId('sale_id');
            }
        });
    }
};