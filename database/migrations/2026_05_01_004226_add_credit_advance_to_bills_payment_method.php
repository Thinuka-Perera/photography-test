<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL: modify the enum to add new values
        // SQLite doesn't support MODIFY COLUMN, so we skip it
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `bills` MODIFY COLUMN `payment_method` ENUM('cash','card','split','credit','advance','bank_transfer') NOT NULL DEFAULT 'cash'");
        }
    }

    public function down(): void
    {
        // MySQL: modify the enum back
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `bills` MODIFY COLUMN `payment_method` ENUM('cash','card','split') NOT NULL DEFAULT 'cash'");
        }
    }
};
