<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Modules\Shops\Services\ShopService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function __construct(private readonly ShopService $shops) {}

    public function index(Request $request): Response
    {
        $actor = $request->user()->loadMissing('role');

        return Inertia::render('Users/Index', [
            'users' => User::query()
                ->with(['role', 'shops'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'created_at' => $user->created_at?->toDateString(),
                    'is_current' => $actor->is($user),
                    'is_manageable' => $this->canManageUser($actor, $user),
                    'role' => $user->role ? [
                        'id' => $user->role->id,
                        'name' => $user->role->name,
                        'slug' => $user->role->slug,
                    ] : null,
                    'shop_ids' => $user->shops->pluck('id')->toArray(),
                ])
                ->values(),
            'roles' => $this->assignableRoles($actor)
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'slug' => $role->slug,
                    'description' => $role->description,
                ])
                ->values(),
            'shops' => $this->shops->listAvailable($actor)
                ->map(fn ($shop) => [
                    'id' => $shop->id,
                    'name' => $shop->name,
                ])
                ->values(),
            'stats' => [
                'total' => User::count(),
                'admins' => User::query()
                    ->whereHas('role', fn ($query) => $query->whereIn('slug', Role::adminRoleSlugs()))
                    ->count(),
                'staff' => User::query()
                    ->whereHas('role', fn ($query) => $query->whereNotIn('slug', Role::adminRoleSlugs()))
                    ->count(),
                'roles' => Role::count(),
            ],
            'currentUserId' => $actor->id,
            'canAssignSuperAdmin' => $actor->isSuperAdmin(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'role_id' => ['required', 'integer', Rule::exists('roles', 'id')],
            'password' => ['required', 'confirmed', Password::defaults()],
            'shop_ids' => ['nullable', 'array'],
            'shop_ids.*' => ['integer', 'exists:shops,id'],
        ]);

        $role = Role::query()->findOrFail($data['role_id']);
        $actor = $request->user();
        $this->ensureRoleAssignable($actor, $role);

        $shopIds = $this->filterShopIdsForActor($actor, $data['shop_ids'] ?? []);
        unset($data['shop_ids']);

        $this->ensureAuthorizedShopsForRole($role, $shopIds);

        $user = User::create($data);

        if ($request->has('shop_ids')) {
            $user->shops()->sync($shopIds);
        }

        return back()->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        $this->ensureTargetManageable($actor, $user);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'role_id' => ['required', 'integer', Rule::exists('roles', 'id')],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'shop_ids' => ['nullable', 'array'],
            'shop_ids.*' => ['integer', 'exists:shops,id'],
        ]);

        $role = Role::query()->findOrFail($data['role_id']);
        $this->ensureRoleAssignable($actor, $role);

        $shopIds = $this->filterShopIdsForActor($actor, $data['shop_ids'] ?? []);
        unset($data['shop_ids']);

        $this->ensureAuthorizedShopsForRole($role, $shopIds);
        $this->ensureLastSuperAdminIsProtected($user, $role);

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $user->update($data);

        if ($request->has('shop_ids')) {
            $user->shops()->sync($shopIds);
        }

        return back()->with('success', 'User updated successfully.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        $this->ensureTargetManageable($actor, $user);

        if ($actor->is($user)) {
            return back()->with('error', 'You cannot delete the account you are currently using.');
        }

        if ($this->isLastSuperAdminRemoval($user)) {
            return back()->with('error', 'At least one super admin must remain in the system.');
        }

        $user->delete();

        return back()->with('success', 'User deleted successfully.');
    }

    /**
     * Non-admin users can only assign shops they themselves can access.
     *
     * @param  array<int|string|null>  $shopIds
     * @return array<int>
     */
    protected function filterShopIdsForActor(User $actor, array $shopIds): array
    {
        $ids = array_values(array_unique(array_filter(
            array_map(static fn ($id) => (int) $id, $shopIds),
            static fn (int $id) => $id > 0,
        )));

        if ($actor->hasAnyRole(Role::adminRoleSlugs())) {
            return $ids;
        }

        $allowed = $actor->shops()->pluck('shops.id')->all();

        return array_values(array_intersect($ids, $allowed));
    }

    protected function assignableRoles(User $actor)
    {
        $query = Role::query()->orderBy('sort_order');

        if (! $actor->isSuperAdmin()) {
            $query->where('slug', '!=', 'super_admin');
        }

        return $query->get();
    }

    protected function canManageUser(User $actor, User $target): bool
    {
        return $actor->isSuperAdmin() || $target->role?->slug !== 'super_admin';
    }

    protected function ensureTargetManageable(User $actor, User $target): void
    {
        if (! $this->canManageUser($actor, $target)) {
            abort(403, 'Only super admins can manage super admin accounts.');
        }
    }

    protected function ensureRoleAssignable(User $actor, Role $role): void
    {
        if ($role->slug === 'super_admin' && ! $actor->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'role_id' => 'Only super admins can assign the Super Admin role.',
            ]);
        }
    }

    /**
     * Super Admin and Admin may work without shop_user rows; other roles need
     * at least one shop so ActiveShopResolver and shop switching behave correctly.
     */
    protected function ensureAuthorizedShopsForRole(Role $role, array $shopIds): void
    {
        if (in_array($role->slug, Role::adminRoleSlugs(), true)) {
            return;
        }

        $ids = array_values(array_filter(
            $shopIds,
            static fn ($id) => $id !== null && $id !== '' && $id !== false,
        ));

        if ($ids === []) {
            throw ValidationException::withMessages([
                'shop_ids' => 'Assign at least one authorized shop for this role. Otherwise the user cannot access shop-scoped pages or switch shops.',
            ]);
        }
    }

    protected function ensureLastSuperAdminIsProtected(User $target, ?Role $newRole = null): void
    {
        if (! $this->isLastSuperAdminRemoval($target, $newRole)) {
            return;
        }

        throw ValidationException::withMessages([
            'role_id' => 'At least one super admin must remain in the system.',
        ]);
    }

    protected function isLastSuperAdminRemoval(User $target, ?Role $newRole = null): bool
    {
        $isCurrentlySuperAdmin = $target->role?->slug === 'super_admin';
        $willRemainSuperAdmin = ($newRole?->slug ?? $target->role?->slug) === 'super_admin';

        if (! $isCurrentlySuperAdmin || $willRemainSuperAdmin) {
            return false;
        }

        $superAdminCount = User::query()
            ->whereHas('role', fn ($query) => $query->where('slug', 'super_admin'))
            ->count();

        return $superAdminCount <= 1;
    }
}
