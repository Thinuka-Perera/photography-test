<?php

namespace App\Models;

use App\Modules\Shops\Models\Shop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    protected $fillable = [
        'shop_id',
        'name',
        'email',
        'phone',
        'role',
        'job_role',
        'default_commission_pct',
        'status',
        'basic_salary',
        'attendance_allowance',
        'overtime_rate',
        'notes',
        'address',
        'parent_phone',
        'real_location',
        'epf_number',
        'birthday',
    ];

    protected $casts = [
        'birthday' => 'date',
        'basic_salary' => 'decimal:2',
        'attendance_allowance' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'default_commission_pct' => 'decimal:2',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function scopeForShop(Builder $query, int $shopId): Builder
    {
        return $query->where('employees.shop_id', $shopId);
    }

    public function salaryProfiles(): HasMany
    {
        return $this->hasMany(SalaryProfile::class);
    }

    public function billsCreated(): HasMany
    {
        return $this->hasMany(Bill::class, 'created_by');
    }

    public function billsAsEditor(): HasMany
    {
        return $this->hasMany(Bill::class, 'editor_id');
    }

    public function billsAsDealer(): HasMany
    {
        return $this->hasMany(Bill::class, 'dealer_id');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(EditorCommission::class, 'editor_id');
    }

    public function dealerCommissions(): HasMany
    {
        return $this->hasMany(DealerCommission::class, 'dealer_id');
    }

    public function scopeEditors(Builder $query): Builder
    {
        return $query->where(function (Builder $builder) {
            $builder->where('job_role', 'editor')
                ->orWhere('role', 'editor');
        });
    }

    public function scopeDealers(Builder $query): Builder
    {
        return $query->where(function (Builder $builder) {
            $builder->where('job_role', 'like', '%dealer%')
                ->orWhere('role', 'like', '%dealer%');
        });
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);

        if ($term === '') {
            return $query;
        }

        return $query->where(function (Builder $builder) use ($term) {
            $builder
                ->where('name', 'like', "%{$term}%")
                ->orWhere('phone', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('role', 'like', "%{$term}%");
        });
    }

    /**
     * Resolve the employee ID corresponding to a given User.
     *
     * @param \App\Models\User|null $user
     * @param int $shopId
     * @return int|null
     */
    public static function resolveForUser($user, int $shopId): ?int
    {
        if (! $user) {
            return null;
        }

        // 1. Try matching by shop, email, and name
        $employeeId = self::query()
            ->forShop($shopId)
            ->where('email', $user->email)
            ->where('name', $user->name)
            ->value('id');

        if ($employeeId) {
            return (int) $employeeId;
        }

        // 2. Try matching by shop and email only
        $employeeId = self::query()
            ->forShop($shopId)
            ->where('email', $user->email)
            ->value('id');

        if ($employeeId) {
            return (int) $employeeId;
        }

        // 3. Try matching by shop and name only
        $employeeId = self::query()
            ->forShop($shopId)
            ->where('name', $user->name)
            ->value('id');

        if ($employeeId) {
            return (int) $employeeId;
        }

        // 4. Try matching by email only across any shop
        $employeeId = self::query()
            ->where('email', $user->email)
            ->value('id');

        if ($employeeId) {
            return (int) $employeeId;
        }

        // 5. Try matching by name only across any shop
        $employeeId = self::query()
            ->where('name', $user->name)
            ->value('id');

        if ($employeeId) {
            return (int) $employeeId;
        }

        // 6. Fallback: first active employee in this shop
        $employeeId = self::query()
            ->forShop($shopId)
            ->where('status', 'active')
            ->value('id');

        if ($employeeId) {
            return (int) $employeeId;
        }

        // 7. Fallback: first employee in this shop
        $employeeId = self::query()
            ->forShop($shopId)
            ->value('id');

        if ($employeeId) {
            return (int) $employeeId;
        }

        // 8. Fallback: first employee in database
        $employeeId = self::query()->value('id');
        return $employeeId ? (int) $employeeId : null;
    }
}
