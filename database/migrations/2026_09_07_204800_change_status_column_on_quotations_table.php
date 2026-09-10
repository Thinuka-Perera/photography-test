<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE quotations MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft'");
        } else {
            Schema::table('quotations', function (Blueprint $table) {
                $table->string('status', 50)->default('draft')->change();
            });
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE quotations MODIFY COLUMN status ENUM('draft', 'awaiting_approval', 'approved', 'rejected', 'converted') NOT NULL DEFAULT 'draft'");
        }
    }
};
