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
        Schema::table('events', function (Blueprint $table) {
            $table->string('client_phone', 50)->nullable()->after('client_name');
            $table->string('wedding_location', 255)->nullable()->after('location');
            $table->string('saloon_location', 255)->nullable()->after('wedding_location');
            $table->string('photo_shoot_location', 255)->nullable()->after('saloon_location');
            $table->json('custom_sections')->nullable()->after('notes');
            $table->json('photography_packages')->nullable()->after('custom_sections');
            $table->json('videography_packages')->nullable()->after('photography_packages');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'client_phone',
                'wedding_location',
                'saloon_location',
                'photo_shoot_location',
                'custom_sections',
                'photography_packages',
                'videography_packages',
            ]);
        });
    }
};
