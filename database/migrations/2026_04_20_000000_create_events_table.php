<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->enum('event_type', ['wedding', 'party', 'corporate_shoot', 'other'])->default('other');
            $table->string('client_name');
            $table->date('event_date');
            $table->string('location')->nullable();
            $table->enum('status', ['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'])->default('draft');
            $table->unsignedInteger('expected_guests')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['event_date', 'status']);
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
