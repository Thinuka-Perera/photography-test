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
        Schema::table('employees', function (Blueprint $table) {
            $table->string('address')->nullable()->after('notes');
            $table->string('parent_phone')->nullable()->after('address');
            $table->string('real_location')->nullable()->after('parent_phone');
            $table->string('epf_number')->nullable()->after('real_location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['address', 'parent_phone', 'real_location', 'epf_number']);
        });
    }
};
