<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RoleAccessController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Roles/Access', [
            'roles' => Role::query()
                ->withCount('users')
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'slug' => $role->slug,
                    'description' => $role->description,
                    'permissions' => $role->pagePermissions(),
                    'locked' => $role->slug === 'super_admin',
                    'is_admin_role' => in_array($role->slug, Role::adminRoleSlugs(), true),
                    'user_count' => $role->users_count,
                ])
                ->values(),
            'pages' => collect(config('access.pages', []))
                ->groupBy('section')
                ->map(fn ($pages, $section) => [
                    'section' => $section,
                    'pages' => $pages->values()->all(),
                ])
                ->values(),
            'adminRoleSlugs' => Role::adminRoleSlugs(),
            'adminOnlyPages' => config('access.admin_only_pages', []),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:roles,name'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $slug = str($data['name'])->slug();

        // Ensure unique slug
        if (Role::where('slug', $slug)->exists()) {
            $slug .= '-' . rand(100, 999);
        }

        Role::create([
            'name' => $data['name'],
            'slug' => (string) $slug,
            'description' => $data['description'],
            'permissions' => [],
            'sort_order' => Role::count() + 1,
        ]);

        return back()->with('success', "Role '{$data['name']}' created successfully.");
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $data = $request->validate([
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        if ($role->slug === 'super_admin') {
            return back()->with('warning', 'Super Admin always has full access.');
        }

        $permissions = collect($data['permissions'] ?? [])
            ->filter()
            ->unique()
            ->values();

        $adminOnlyPages = collect(config('access.admin_only_pages', []));

        if (in_array($role->slug, Role::adminRoleSlugs(), true)) {
            // Give all access to admin only pages for admin roles
            foreach ($adminOnlyPages as $page) {
                $permissions->push("{$page}.view");
                $permissions->push("{$page}.create");
                $permissions->push("{$page}.edit");
                $permissions->push("{$page}.delete");
            }
            $permissions = $permissions->unique()->values();
        } else {
            // Non-admin roles cannot have access to admin-only pages
            $permissions = $permissions
                ->reject(fn (string $permission) => $adminOnlyPages->contains(explode('.', $permission)[0]))
                ->values();
        }

        $role->update([
            'permissions' => $permissions->all(),
        ]);

        return back()->with('success', "{$role->name} access updated successfully.");
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->slug === 'super_admin') {
            return back()->with('error', 'Super Admin role cannot be deleted.');
        }

        if ($role->users()->exists()) {
            return back()->with('error', 'Cannot delete role because it is assigned to users.');
        }

        $role->delete();

        return back()->with('success', "Role '{$role->name}' deleted successfully.");
    }
}
