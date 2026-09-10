<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('role')->nullable();
            $table->string('status')->default('active');
            $table->decimal('basic_salary', 12, 2)->default(0);
            $table->decimal('attendance_allowance', 12, 2)->default(0);
            $table->decimal('overtime_rate', 12, 2)->default(150);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
