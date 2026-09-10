<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('pos_tabs');
    }

    public function down(): void
    {
        Schema::create('pos_tabs', function ($table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_stock_tab')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['sort_order', 'is_active']);
        });
    }
};