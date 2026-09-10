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
        Schema::create('invoice_settings', function (Blueprint $table) {
            $table->id();
            
            // Business identity
            $table->string('shop_name')->default('Mr Arachchi Photography');
            $table->string('tagline')->nullable()->default('PHOTOGRAPHY');
            $table->boolean('show_tagline')->default(true);
            
            // Contact info — each with toggle
            $table->string('phone')->nullable();
            $table->boolean('show_phone')->default(true);
            $table->string('email')->nullable();
            $table->boolean('show_email')->default(true);
            $table->text('address')->nullable();
            $table->boolean('show_address')->default(true);
            
            // Payment information
            $table->string('bank_account_no')->nullable();
            $table->string('account_name')->nullable();
            $table->text('bank_details')->nullable();
            
            // Timestamps
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_settings');
    }
};
