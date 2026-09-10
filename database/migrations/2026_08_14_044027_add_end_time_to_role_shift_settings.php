<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('role_shift_settings', function (Blueprint $table) {
            $table->time('end_time')->default('17:00:00')->after('start_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('role_shift_settings', function (Blueprint $table) {
            $table->dropColumn('end_time');
        });
    }
};
