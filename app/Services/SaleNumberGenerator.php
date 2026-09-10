<?php

namespace App\Services;

use App\Models\Sale;
use Illuminate\Support\Carbon;

class SaleNumberGenerator
{
    /**
     * Generate a unique sale number.
     * Format: SALE-20260418-0001
     *
     * Safety strategy: NO lockForUpdate() here.
     * lockForUpdate() only works inside a DB transaction — running it
     * outside is silently ignored and creates a false sense of safety.
     *
     * Instead, we rely on TWO real safeguards:
     *   1. The UNIQUE constraint on sale_number (DB-level, bulletproof)
     *   2. SaleService wraps finalizeSale() in DB::transaction(), so
     *      generate() is always called within a transaction in practice.
     *
     * If two concurrent requests collide on the same number,
     * the DB unique constraint throws → transaction rolls back → retry.
     */
    public static function generate(): string
    {
        $today = Carbon::today()->format('Ymd');

        // Find the highest sequence number used today
        $lastSale = Sale::whereDate('created_at', Carbon::today())
            ->orderByDesc('id')
            ->first();

        if ($lastSale) {
            // Extract sequence from SALE-20260418-0042 → 42
            $lastSequence = (int) substr($lastSale->sale_number, -4);
            $nextSequence = $lastSequence + 1;
        } else {
            $nextSequence = 1;
        }

        return 'SALE-' . $today . '-' . str_pad($nextSequence, 4, '0', STR_PAD_LEFT);
    }
}
