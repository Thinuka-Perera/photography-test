<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_shift_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('role', 32);
            $table->time('start_time');
            $table->timestamps();

            $table->unique(['shop_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_shift_settings');
    }
};
