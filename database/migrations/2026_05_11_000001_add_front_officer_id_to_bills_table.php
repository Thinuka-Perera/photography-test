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
        Schema::table('bills', function (Blueprint $table) {
            if (!Schema::hasColumn('bills', 'front_officer_id')) {
                $table->unsignedBigInteger('front_officer_id')->nullable()->after('editor_id');
                $table->foreign('front_officer_id')->references('id')->on('employees')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            if (Schema::hasColumn('bills', 'front_officer_id')) {
                $table->dropForeign(['front_officer_id']);
                $table->dropColumn('front_officer_id');
            }
        });
    }
};
