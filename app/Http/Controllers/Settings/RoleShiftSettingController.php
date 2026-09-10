<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\RoleShiftSetting;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleShiftSettingController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->hasAnyRole(['super_admin', 'admin']), 403, 'Unauthorized');

        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop?->exists, 404);

        $activeRoles = RoleShiftSetting::getActiveRoles($activeShop->id);

        $validated = $request->validate([
            'shifts' => ['required', 'array', 'size:'.count($activeRoles)],
            'shifts.*.role' => ['required', Rule::in($activeRoles)],
            'shifts.*.start_time' => ['required', 'date_format:H:i'],
            'shifts.*.end_time' => ['required', 'date_format:H:i'],
        ]);

        foreach ($validated['shifts'] as $shift) {
            RoleShiftSetting::query()->updateOrCreate(
                [
                    'shop_id' => $activeShop->id,
                    'role' => $shift['role'],
                ],
                [
                    'start_time' => RoleShiftSetting::normalizeTime($shift['start_time']).':00',
                    'end_time' => RoleShiftSetting::normalizeTime($shift['end_time']).':00',
                ],
            );
        }

        return back()->with('success', 'Shift & role settings saved successfully.');
    }

    private function resolveActiveShop(): ?Shop
    {
        if (app()->bound(Shop::class)) {
            $bound = app(Shop::class);
            if ($bound instanceof Shop && $bound->exists) {
                return $bound;
            }
        }

        return Shop::query()
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();
    }
}
