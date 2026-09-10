<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bill_counters', function (Blueprint $table) {
            $table->id();
            // business date in Ymd format (e.g. 20260506)
            $table->string('date', 8)->unique();
            // next_number stores the next available sequential number for the date
            $table->unsignedInteger('next_number')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_counters');
    }
};
