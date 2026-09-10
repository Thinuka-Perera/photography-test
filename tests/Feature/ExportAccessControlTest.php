<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportAccessControlTest extends TestCase
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

    public function test_super_admin_has_all_export_permissions(): void
    {
        $superAdmin = User::factory()->create([
            'last_shop_id' => $this->shop->id,
        ]);
        $superAdminRole = Role::firstOrCreate(['slug' => 'super_admin'], [
            'name' => 'Super Admin',
            'permissions' => ['*'],
            'sort_order' => 0,
        ]);
        $superAdmin->update(['role_id' => $superAdminRole->id]);
        $superAdmin->refresh();

        $response = $this->actingAs($superAdmin)->get(route('inventory.stock'));

        $response->assertOk();
        $pageProps = $response->original->getData()['page']['props'];

        $this->assertTrue($pageProps['auth']['access']['is_super_admin']);
    }

    public function test_user_with_wildcard_role_has_export_permissions(): void
    {
        $admin = User::factory()->create([
            'last_shop_id' => $this->shop->id,
        ]);
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], [
            'name' => 'Admin',
            'permissions' => ['*'],
            'sort_order' => 1,
        ]);
        $admin->update(['role_id' => $adminRole->id]);
        $admin->refresh();

        $response = $this->actingAs($admin)->get(route('inventory.stock'));

        $response->assertOk();
        $pageProps = $response->original->getData()['page']['props'];
        $pageLookup = $pageProps['auth']['access']['page_lookup'];

        // Under wildcard permissions, they have the page key representing all page action capabilities.
        $hasExportAccess = ($pageLookup['stock-tracking.export'] ?? false) || ($pageLookup['stock-tracking'] ?? false);
        $this->assertTrue($hasExportAccess);

        $hasInventoryExportAccess = ($pageLookup['inventory.export'] ?? false) || ($pageLookup['inventory'] ?? false);
        $this->assertTrue($hasInventoryExportAccess);
    }

    public function test_role_with_explicit_export_permission_has_it(): void
    {
        $user = User::factory()->create([
            'last_shop_id' => $this->shop->id,
        ]);
        $role = Role::firstOrCreate(['slug' => 'test_manager'], [
            'name' => 'Test Manager',
            'permissions' => ['stock-tracking.view', 'stock-tracking.export'],
            'sort_order' => 5,
        ]);
        $user->update(['role_id' => $role->id]);
        $user->refresh();

        $response = $this->actingAs($user)->get(route('inventory.stock'));

        $response->assertOk();
        $pageProps = $response->original->getData()['page']['props'];
        $pageLookup = $pageProps['auth']['access']['page_lookup'];

        $this->assertTrue($pageLookup['stock-tracking.view'] ?? false);
        $this->assertTrue($pageLookup['stock-tracking.export'] ?? false);
        $this->assertFalse($pageLookup['stock-tracking'] ?? false); // No full access
    }

    public function test_role_without_export_permission_does_not_have_it(): void
    {
        $user = User::factory()->create([
            'last_shop_id' => $this->shop->id,
        ]);
        $role = Role::firstOrCreate(['slug' => 'test_staff'], [
            'name' => 'Test Staff',
            'permissions' => ['stock-tracking.view'],
            'sort_order' => 6,
        ]);
        $user->update(['role_id' => $role->id]);
        $user->refresh();

        $response = $this->actingAs($user)->get(route('inventory.stock'));

        $response->assertOk();
        $pageProps = $response->original->getData()['page']['props'];
        $pageLookup = $pageProps['auth']['access']['page_lookup'];

        $this->assertTrue($pageLookup['stock-tracking.view'] ?? false);
        $this->assertFalse($pageLookup['stock-tracking.export'] ?? false);
        $this->assertFalse($pageLookup['stock-tracking'] ?? false);
    }
}
