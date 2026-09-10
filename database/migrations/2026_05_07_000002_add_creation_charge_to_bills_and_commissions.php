<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            if (! Schema::hasColumn('bills', 'creation_charge')) {
                $table->decimal('creation_charge', 10, 2)->default(0)->after('notes');
            }
        });

        Schema::table('editor_commissions', function (Blueprint $table) {
            if (! Schema::hasColumn('editor_commissions', 'creation_charge_amt')) {
                $table->decimal('creation_charge_amt', 10, 2)->default(0)->after('commission_amt');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            if (Schema::hasColumn('bills', 'creation_charge')) {
                $table->dropColumn('creation_charge');
            }
        });

        Schema::table('editor_commissions', function (Blueprint $table) {
            if (Schema::hasColumn('editor_commissions', 'creation_charge_amt')) {
                $table->dropColumn('creation_charge_amt');
            }
        });
    }
};
