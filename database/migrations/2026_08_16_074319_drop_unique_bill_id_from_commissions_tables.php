<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('editor_commissions', function (Blueprint $table) {
            $table->dropForeign(['bill_id']);
            $table->dropUnique(['bill_id']);
            $table->foreign('bill_id')->references('id')->on('bills')->cascadeOnDelete();
        });

        Schema::table('dealer_commissions', function (Blueprint $table) {
            $table->dropForeign(['bill_id']);
            $table->dropUnique(['bill_id']);
            $table->foreign('bill_id')->references('id')->on('bills')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('editor_commissions', function (Blueprint $table) {
            $table->dropForeign(['bill_id']);
            $table->unique('bill_id');
            $table->foreign('bill_id')->references('id')->on('bills')->cascadeOnDelete();
        });

        Schema::table('dealer_commissions', function (Blueprint $table) {
            $table->dropForeign(['bill_id']);
            $table->unique('bill_id');
            $table->foreign('bill_id')->references('id')->on('bills')->cascadeOnDelete();
        });
    }
};
