<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class ShopSetting extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'key', 'value'];

    /**
     * Get a setting value by key for the active/specified shop.
     */
    public static function get(string $key, mixed $default = null, ?int $shopId = null): mixed
    {
        $shopId = $shopId ?? (app()->bound(\App\Modules\Shops\Models\Shop::class)
            ? app(\App\Modules\Shops\Models\Shop::class)->id
            : null);

        if (! $shopId) {
            return $default;
        }
        
        $setting = static::query()
            ->forShop($shopId)
            ->where('key', $key)
            ->first();

        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value (upsert) for the active/specified shop.
     */
    public static function set(string $key, mixed $value, ?int $shopId = null): void
    {
        $shopId = $shopId ?? (app()->bound(\App\Modules\Shops\Models\Shop::class)
            ? app(\App\Modules\Shops\Models\Shop::class)->id
            : null);

        abort_unless($shopId, 404, 'Active shop is required to save settings.');

        static::updateOrCreate(
            ['shop_id' => $shopId, 'key' => $key], 
            ['value' => $value]
        );
    }

    /**
     * Get all settings as key→value array for the active/specified shop.
     */
    public static function all_settings(?int $shopId = null): array
    {
        $shopId = $shopId ?? (app()->bound(\App\Modules\Shops\Models\Shop::class)
            ? app(\App\Modules\Shops\Models\Shop::class)->id
            : null);

        if (! $shopId) {
            return [];
        }

        return static::forShop($shopId)
            ->pluck('value', 'key')
            ->toArray();
    }
}