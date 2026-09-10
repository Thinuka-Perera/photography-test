<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('role_shift_settings')
            ->where('role', 'editor')
            ->update(['start_time' => '08:45:00']);
    }

    public function down(): void
    {
        DB::table('role_shift_settings')
            ->where('role', 'editor')
            ->update(['start_time' => '09:00:00']);
    }
};
