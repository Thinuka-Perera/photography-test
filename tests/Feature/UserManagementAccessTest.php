<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admins_can_open_user_management(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->get(route('users.index'));

        $response->assertOk();
        $response->assertSee('User Management');
    }

    public function test_cashiers_cannot_open_user_management(): void
    {
        $cashier = User::factory()->cashier()->create();

        $response = $this->actingAs($cashier)->get(route('users.index'));

        $response->assertForbidden();
    }

    public function test_non_admin_roles_cannot_receive_admin_only_pages(): void
    {
        $admin = User::factory()->admin()->create();
        $cashierRole = Role::query()->where('slug', 'cashier')->firstOrFail();

        $this->actingAs($admin)->put(route('roles.access.update', $cashierRole), [
            'permissions' => [
                'dashboard',
                'customers',
                'user-management',
                'role-access',
            ],
        ])->assertRedirect();

        $cashierRole->refresh();

        $this->assertEqualsCanonicalizing(
            ['dashboard', 'customers'],
            $cashierRole->permissions,
        );
        $this->assertNotContains('user-management', $cashierRole->permissions);
        $this->assertNotContains('role-access', $cashierRole->permissions);
    }
}
