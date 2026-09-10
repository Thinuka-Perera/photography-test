<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\SalaryProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalariesAccessTest extends TestCase
{
    use RefreshDatabase;

    private \App\Modules\Shops\Models\Shop $shop;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shop = \App\Modules\Shops\Models\Shop::where('slug', 'main')->first()
            ?? \App\Modules\Shops\Models\Shop::create([
                'slug' => 'main',
                'name' => 'Main Studio',
                'is_default' => true,
                'is_active' => true,
            ]);

        $this->app->instance(\App\Modules\Shops\Models\Shop::class, $this->shop);
    }

    public function test_admins_can_access_salaries_index_and_view_all(): void
    {
        $admin = User::factory()->create([
            'last_shop_id' => $this->shop->id,
        ]);
        
        // Assert they have admin role or make sure they bypass role restriction
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], [
            'name' => 'Admin',
            'permissions' => ['*'],
            'sort_order' => 1,
        ]);
        $admin->update(['role_id' => $adminRole->id]);

        // Create two employees with salary profiles
        $emp1 = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => 'Emp One',
            'email' => 'emp1@example.com',
            'role' => 'editor',
            'is_active' => true,
        ]);

        $emp2 = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => 'Emp Two',
            'email' => 'emp2@example.com',
            'role' => 'front_office',
            'is_active' => true,
        ]);

        SalaryProfile::create([
            'employee_id' => $emp1->id,
            'month' => now()->startOfMonth()->toDateString(),
            'basic_salary' => 50000,
            'attendance_allowance' => 5000,
            'overtime_rate' => 150,
        ]);

        SalaryProfile::create([
            'employee_id' => $emp2->id,
            'month' => now()->startOfMonth()->toDateString(),
            'basic_salary' => 60000,
            'attendance_allowance' => 6000,
            'overtime_rate' => 150,
        ]);

        $response = $this->actingAs($admin)->get(route('payroll.salaries.index'));

        $response->assertOk();
        // Since we render Inertia page, check that it returns the expected items
        $pageRows = $response->original->getData()['page']['props']['rows'];
        $this->assertCount(2, $pageRows);
    }

    public function test_non_admins_only_view_own_salary_profile(): void
    {
        // Define a role that has salaries view permission
        $role = Role::create([
            'name' => 'Custom Staff',
            'slug' => 'custom_staff',
            'permissions' => ['salaries.view'],
            'sort_order' => 10,
        ]);

        $user = User::factory()->create([
            'email' => 'staff1@example.com',
            'name' => 'Staff One',
            'role_id' => $role->id,
            'last_shop_id' => $this->shop->id,
        ]);

        // Create current employee matching this user
        $empSelf = Employee::create([
            'shop_id' => $this->shop->id,
            'email' => 'staff1@example.com',
            'name' => 'Staff One',
            'role' => 'editor',
            'is_active' => true,
        ]);

        // Create another employee
        $empOther = Employee::create([
            'shop_id' => $this->shop->id,
            'email' => 'other@example.com',
            'name' => 'Other Employee',
            'role' => 'editor',
            'is_active' => true,
        ]);

        SalaryProfile::create([
            'employee_id' => $empSelf->id,
            'month' => now()->startOfMonth()->toDateString(),
            'basic_salary' => 50000,
            'attendance_allowance' => 5000,
            'overtime_rate' => 150,
        ]);

        SalaryProfile::create([
            'employee_id' => $empOther->id,
            'month' => now()->startOfMonth()->toDateString(),
            'basic_salary' => 60000,
            'attendance_allowance' => 6000,
            'overtime_rate' => 150,
        ]);

        $response = $this->actingAs($user)->get(route('payroll.salaries.index'));

        $response->assertOk();
        $pageRows = $response->original->getData()['page']['props']['rows'];
        // Should only see self
        $this->assertCount(1, $pageRows);
        $this->assertEquals($empSelf->id, $pageRows[0]['employee']['id']);
    }

    public function test_users_without_salaries_access_are_redirected(): void
    {
        // Role without salaries access
        $role = Role::create([
            'name' => 'No Salary Role',
            'slug' => 'no_salary_role',
            'permissions' => ['dashboard'],
            'sort_order' => 11,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'last_shop_id' => $this->shop->id,
        ]);

        $response = $this->actingAs($user)->get(route('payroll.salaries.index'));
        $response->assertRedirect();
    }

    public function test_view_only_role_cannot_perform_write_actions(): void
    {
        $role = Role::create([
            'name' => 'View Only Role',
            'slug' => 'view_only_role',
            'permissions' => ['salaries.view'],
            'sort_order' => 12,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'last_shop_id' => $this->shop->id,
        ]);

        $emp = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => 'Test Employee',
            'email' => 'test@example.com',
            'role' => 'editor',
            'is_active' => true,
        ]);

        $salaryProfile = SalaryProfile::create([
            'employee_id' => $emp->id,
            'month' => now()->startOfMonth()->toDateString(),
            'basic_salary' => 50000,
        ]);

        // Attempt Create -> should return error redirect or 403 based on middleware
        $createResponse = $this->actingAs($user)->post(route('payroll.salaries.store'), [
            'employee_id' => $emp->id,
            'month' => now()->startOfMonth()->format('Y-m'),
            'basic_salary' => 45000,
            'attendance_allowance' => 1000,
            'overtime_rate' => 120,
        ]);
        $createResponse->assertForbidden();

        // Attempt Update -> should return 403
        $updateResponse = $this->actingAs($user)->put(route('payroll.salaries.update', $salaryProfile), [
            'employee_id' => $emp->id,
            'month' => now()->startOfMonth()->format('Y-m'),
            'basic_salary' => 55000,
            'attendance_allowance' => 1000,
            'overtime_rate' => 120,
        ]);
        $updateResponse->assertForbidden();

        // Attempt Delete -> should return 403
        $deleteResponse = $this->actingAs($user)->delete(route('payroll.salaries.destroy', $salaryProfile));
        $deleteResponse->assertForbidden();
    }
}
