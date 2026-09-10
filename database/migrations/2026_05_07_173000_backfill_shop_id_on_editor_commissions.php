<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('editor_commissions') || !Schema::hasTable('bills')) {
            return;
        }

        // Backfill legacy rows created before EditorCommission allowed mass-assigned shop_id.
        $driver = DB::getDriverName();
        
        if ($driver === 'sqlite') {
            DB::statement("
                UPDATE editor_commissions
                SET shop_id = (
                    SELECT shop_id FROM bills WHERE id = editor_commissions.bill_id
                )
                WHERE shop_id IS NULL AND bill_id IS NOT NULL
            ");
        } else {
            DB::statement("
                UPDATE editor_commissions ec
                INNER JOIN bills b ON b.id = ec.bill_id
                SET ec.shop_id = b.shop_id
                WHERE ec.shop_id IS NULL
            ");
        }
    }

    public function down(): void
    {
        // No destructive rollback for data backfill migration.
    }
};

