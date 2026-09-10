<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class Role extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'permissions',
        'sort_order',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function hasPermission(string $permission): bool
    {
        $permissions = $this->permissions;
        if (is_null($permissions) || empty($permissions)) {
            $permissions = config("access.roles.{$this->slug}.permissions", []);
        }

        // Map legacy 'studio.credit_management' to 'credit-management'
        $permissions = array_map(function ($p) {
            return str_replace('studio.credit_management', 'credit-management', $p);
        }, $permissions);

        if (str_starts_with($permission, 'studio.credit_management')) {
            $permission = str_replace('studio.credit_management', 'credit-management', $permission);
        }

        // Map legacy 'refunds' to 'returns' dynamically to support older databases
        if (in_array('refunds', $permissions, true) && !in_array('returns', $permissions, true)) {
            $permissions[] = 'returns';
        }

        if (in_array('*', $permissions, true)) {
            return true;
        }

        if (in_array($permission, $permissions, true)) {
            return true;
        }

        // If checking 'inventory' (base page), and they have 'inventory.view' or 'inventory.edit', return true
        if (! str_contains($permission, '.')) {
            foreach ($permissions as $p) {
                if (str_starts_with($p, $permission . '.')) {
                    return true;
                }
            }
        }

        // Legacy support: if checking 'inventory.view', and they have 'inventory' (full access), return true
        if (str_contains($permission, '.')) {
            $parts = explode('.', $permission);
            $lastPart = end($parts);
            if (in_array($lastPart, ['view', 'create', 'edit', 'delete', 'export'], true)) {
                array_pop($parts);
                $pageKey = implode('.', $parts);
                if (in_array($pageKey, $permissions, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    public function pagePermissions(): array
    {
        if ($this->hasPermission('*')) {
            return static::pageKeys();
        }

        $perms = $this->permissions;
        if (is_null($perms) || empty($perms)) {
            $perms = config("access.roles.{$this->slug}.permissions", []);
        }

        $perms = array_map(function ($p) {
            return str_replace('studio.credit_management', 'credit-management', $p);
        }, $perms);

        // Map legacy 'refunds' to 'returns' dynamically to support older databases
        if (in_array('refunds', $perms, true) && !in_array('returns', $perms, true)) {
            $perms[] = 'returns';
        }

        if (in_array('daily-sales-report', $perms, true) && !in_array('product-reports', $perms, true)) {
            $perms[] = 'product-reports';
        }

        return $perms;
    }

    public static function pageDefinitions(): Collection
    {
        return collect(config('access.pages', []));
    }

    public static function pageKeys(): array
    {
        return static::pageDefinitions()->pluck('key')->all();
    }

    public static function defaultPermissionsForSlug(string $slug): array
    {
        return config("access.roles.{$slug}.permissions", []);
    }

    public static function adminRoleSlugs(): array
    {
        return config('access.admin_roles', ['super_admin', 'admin']);
    }
}
