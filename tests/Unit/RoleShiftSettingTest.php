<?php

namespace Tests\Unit;

use App\Models\RoleShiftSetting;
use App\Modules\Shops\Models\Shop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleShiftSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_start_time_for_role_uses_stored_value(): void
    {
        $shop = Shop::query()->create([
            'name' => 'Test Shop',
            'slug' => 'test-shop-'.uniqid(),
            'is_active' => true,
            'is_default' => false,
        ]);

        RoleShiftSetting::query()->create([
            'shop_id' => $shop->id,
            'role' => RoleShiftSetting::ROLE_EDITOR,
            'start_time' => '10:30:00',
        ]);

        $this->assertSame(
            '10:30',
            RoleShiftSetting::startTimeFor($shop->id, RoleShiftSetting::ROLE_EDITOR),
        );
    }

    public function test_start_time_falls_back_to_default_when_missing(): void
    {
        $this->assertSame('08:45', RoleShiftSetting::startTimeFor(null, 'editor'));
        $this->assertSame('09:00', RoleShiftSetting::startTimeFor(null, 'front_office'));
    }
}
