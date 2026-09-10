<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Seed default settings
        DB::table('shop_settings')->insert([
            ['key' => 'shop_name',       'value' => 'Photography Shop',  'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_address',    'value' => '',                   'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_phone',      'value' => '',                   'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_email',      'value' => '',                   'created_at' => now(), 'updated_at' => now()],
            ['key' => 'tax_rate',        'value' => '0',                  'created_at' => now(), 'updated_at' => now()],
            ['key' => 'currency',        'value' => 'LKR',                'created_at' => now(), 'updated_at' => now()],
            ['key' => 'invoice_prefix',  'value' => 'INV',                'created_at' => now(), 'updated_at' => now()],
            ['key' => 'invoice_note',    'value' => 'Thank you for your business!', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'auto_send_pdf',   'value' => '1',                  'created_at' => now(), 'updated_at' => now()],
            ['key' => 'low_stock_alert', 'value' => '1',                  'created_at' => now(), 'updated_at' => now()],
            ['key' => 'invoice_approval','value' => '0',                  'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_settings');
    }
};