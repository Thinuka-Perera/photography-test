<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Add role ENUM for job classification (before default_commission_pct)
            $table->enum('job_role', ['front_office', 'editor', 'trainee'])
                ->default('front_office')
                ->after('role');
            
            // Add default commission percentage (only used when job_role = editor)
            $table->decimal('default_commission_pct', 5, 2)
                ->default(5.00)
                ->after('job_role');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['job_role', 'default_commission_pct']);
        });
    }
};
