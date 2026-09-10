<?php

namespace App\Models;

use App\Modules\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class RoleShiftSetting extends Model
{
    public const ROLE_FRONT_OFFICE = 'front_office';

    public const ROLE_EDITOR = 'editor';

    public const ROLE_TRAINEE = 'trainee';

    /** @var array<string, string> */
    public const ROLE_LABELS = [
        self::ROLE_FRONT_OFFICE => 'Front Office',
        self::ROLE_EDITOR => 'Editor',
        self::ROLE_TRAINEE => 'Trainee',
    ];

    /** @var list<string> */
    public const ROLE_KEYS = [
        self::ROLE_FRONT_OFFICE,
        self::ROLE_EDITOR,
        self::ROLE_TRAINEE,
    ];

    protected $fillable = [
        'shop_id',
        'role',
        'start_time',
        'end_time',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public static function normalizeTime(?string $time): string
    {
        if (! $time) {
            return '09:00';
        }

        if (preg_match('/^(\d{2}):(\d{2})/', $time, $matches)) {
            return $matches[1].':'.$matches[2];
        }

        return '09:00';
    }

    public static function defaultStartTime(): string
    {
        return self::normalizeTime((string) config('attendance.late_after', '09:00'));
    }

    public static function defaultStartTimeForRole(string $role): array
    {
        if ($role === self::ROLE_EDITOR) {
            return ['start_time' => '08:45', 'end_time' => '17:00'];
        }

        return ['start_time' => self::defaultStartTime(), 'end_time' => '17:00'];
    }

    public static function startTimeFor(?int $shopId, ?string $role): string
    {
        if ($shopId && $role && in_array($role, self::getActiveRoles($shopId), true)) {
            $stored = static::query()
                ->where('shop_id', $shopId)
                ->where('role', $role)
                ->value('start_time');

            if ($stored) {
                return self::normalizeTime((string) $stored);
            }
        }

        if ($role && in_array($role, self::getActiveRoles($shopId), true)) {
            return self::defaultStartTimeForRole($role)['start_time'];
        }

        return self::defaultStartTime();
    }

    public static function endTimeFor(?int $shopId, ?string $role): string
    {
        if ($shopId && $role && in_array($role, self::getActiveRoles($shopId), true)) {
            $stored = static::query()
                ->where('shop_id', $shopId)
                ->where('role', $role)
                ->value('end_time');

            if ($stored) {
                return self::normalizeTime((string) $stored);
            }
        }

        if ($role && in_array($role, self::getActiveRoles($shopId), true)) {
            return self::defaultStartTimeForRole($role)['end_time'];
        }

        return '17:00';
    }

    /**
     * @return array<string>
     */
    public static function getActiveRoles(?int $shopId = null): array
    {
        // Now exclusively tracking System Roles globally, irrespective of shop usage
        return \App\Models\Role::query()
            ->orderBy('sort_order')
            ->pluck('slug')
            ->toArray();
    }

    /**
     * @return array<string, array{start_time: string, end_time: string}> role => details
     */
    public static function mapForShop(?int $shopId): array
    {
        $roles = self::getActiveRoles($shopId);

        if (! $shopId) {
            return collect($roles)
                ->mapWithKeys(fn (string $role) => [$role => self::defaultStartTimeForRole($role)])
                ->all();
        }

        self::ensureDefaultsForShop($shopId);

        $stored = static::query()
            ->where('shop_id', $shopId)
            ->get()
            ->mapWithKeys(fn (self $row) => [
                $row->role => [
                    'start_time' => self::normalizeTime((string) $row->start_time),
                    'end_time' => self::normalizeTime((string) ($row->end_time ?? '17:00:00')),
                ],
            ]);

        return collect($roles)
            ->mapWithKeys(fn (string $role) => [
                $role => $stored->get($role, self::defaultStartTimeForRole($role)),
            ])
            ->all();
    }

    /**
     * @return list<array{role: string, label: string, start_time: string, end_time: string}>
     */
    public static function listForShop(?int $shopId): array
    {
        $map = self::mapForShop($shopId);
        
        $roles = \App\Models\Role::query()
            ->orderBy('sort_order')
            ->get(['slug', 'name'])
            ->keyBy('slug');

        return collect(self::getActiveRoles($shopId))
            ->map(fn (string $role) => [
                'role' => $role,
                'label' => $roles->get($role)?->name ?? self::ROLE_LABELS[$role] ?? ucfirst(str_replace('_', ' ', $role)),
                'start_time' => $map[$role]['start_time'] ?? '09:00',
                'end_time' => $map[$role]['end_time'] ?? '17:00',
            ])
            ->values()
            ->all();
    }

    public static function ensureDefaultsForShop(int $shopId): void
    {
        foreach (self::getActiveRoles($shopId) as $role) {
            $defaults = self::defaultStartTimeForRole($role);
            static::firstOrCreate(
                ['shop_id' => $shopId, 'role' => $role],
                [
                    'start_time' => $defaults['start_time'].':00',
                    'end_time' => $defaults['end_time'].':00',
                ],
            );
        }
    }

    public static function seedAllShops(): void
    {
        Shop::query()->pluck('id')->each(function (int $shopId) {
            self::ensureDefaultsForShop($shopId);
        });
    }
}
