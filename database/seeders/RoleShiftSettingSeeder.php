<?php

namespace Database\Seeders;

use App\Models\RoleShiftSetting;
use Illuminate\Database\Seeder;

class RoleShiftSettingSeeder extends Seeder
{
    public function run(): void
    {
        RoleShiftSetting::seedAllShops();
    }
}
