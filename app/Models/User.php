<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Schema;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'role_id',
        'last_shop_id',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if ($user->role_id || ! Schema::hasTable('roles')) {
                return;
            }

            $defaultRoleId = Role::query()
                ->where('slug', config('access.default_user_role', 'cashier'))
                ->value('id');

            $user->role_id = $defaultRoleId ?? Role::query()->value('id');
        });
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function loadRoleRelation(): ?Role
    {
        return $this->role ?? ($this->role_id ? $this->role()->first() : null);
    }

    public function hasRole(string $slug): bool
    {
        return $this->loadRoleRelation()?->slug === $slug;
    }

    public function hasAnyRole(array $slugs): bool
    {
        return in_array($this->loadRoleRelation()?->slug, $slugs, true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function pagePermissions(): array
    {
        return $this->loadRoleRelation()?->pagePermissions() ?? [];
    }

    public function canAccessPage(string $pageKey): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->loadRoleRelation()?->hasPermission($pageKey) ?? false;
    }

    /**
     * The shops this user is authorized to access.
     */
    public function shops(): BelongsToMany
    {
        return $this->belongsToMany(\App\Modules\Shops\Models\Shop::class, 'shop_user');
    }

    /**
     * Check if the user has access to a specific shop.
     */
    public function hasAccessToShop(int $shopId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->shops()->where('shops.id', $shopId)->exists();
    }
}
