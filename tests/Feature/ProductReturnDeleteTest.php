<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductReturn;
use App\Models\ProductReturnItem;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductReturnDeleteTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private User $cashierUser;
    private Shop $shop;
    private ProductVariant $variant;
    private ProductReturn $productReturn;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Active Shop
        $this->shop = Shop::where('slug', 'main')->first() ?? Shop::create([
            'slug' => 'main',
            'name' => 'Main Studio',
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->app->instance(Shop::class, $this->shop);

        // 2. Create Roles
        $adminRole = Role::updateOrCreate(['slug' => 'admin'], [
            'name' => 'Admin',
            'permissions' => ['returns'], // Full returns permission includes delete
            'sort_order' => 1,
        ]);

        $cashierRole = Role::updateOrCreate(['slug' => 'cashier'], [
            'name' => 'Cashier',
            'permissions' => ['returns.view', 'returns.create'], // No returns.delete!
            'sort_order' => 2,
        ]);

        // 3. Create Users
        $this->adminUser = User::factory()->create([
            'role_id' => $adminRole->id,
            'last_shop_id' => $this->shop->id,
        ]);

        $this->cashierUser = User::factory()->create([
            'role_id' => $cashierRole->id,
            'last_shop_id' => $this->shop->id,
        ]);

        // 4. Create Product with Inventory
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Frames',
            'type' => 'frame',
        ]);
        $product = Product::create([
            'shop_id' => $this->shop->id,
            'category_id' => $category->id,
            'name' => 'Test Frame',
            'sku' => 'TF-001',
            'status' => 'active',
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Standard',
            'sku' => 'TF-001-STD',
            'status' => 'active',
            'price' => 100.00,
        ]);

        $inventory = Inventory::firstOrNew([
            'variant_id' => $this->variant->id,
        ]);
        $inventory->current_stock = 10;
        $inventory->save();

        // 5. Create an Employee
        $employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $this->adminUser->name,
            'email' => $this->adminUser->email,
            'role' => 'admin',
            'status' => 'active',
        ]);

        // 6. Create a Bill
        $bill = Bill::create([
            'shop_id' => $this->shop->id,
            'bill_number' => 'B001',
            'subtotal' => 100.00,
            'total_amount' => 100.00,
            'payment_status' => 'paid',
            'status' => 'completed',
            'created_by' => $employee->id,
        ]);

        // 7. Create a Return
        $this->productReturn = ProductReturn::create([
            'shop_id' => $this->shop->id,
            'return_number' => 'RET001',
            'sale_id' => $bill->id,
            'total_amount' => 100.00,
            'processed_by' => $this->adminUser->id,
            'reason' => 'Defective',
        ]);

        ProductReturnItem::create([
            'product_return_id' => $this->productReturn->id,
            'product_id' => $this->variant->id,
            'product_name' => 'Test Frame',
            'product_sku' => 'TF-001-STD',
            'quantity' => 1,
            'unit_price' => 100.00,
            'line_total' => 100.00,
        ]);
    }

    /** @test */
    public function guests_cannot_delete_returns()
    {
        $response = $this->delete(route('finance.returns.destroy', $this->productReturn->id));

        $response->assertRedirect('/login');
    }

    /** @test */
    public function users_without_delete_permission_cannot_delete_returns()
    {
        $response = $this->actingAs($this->cashierUser)
            ->delete(route('finance.returns.destroy', $this->productReturn->id));

        $response->assertStatus(403);
    }

    /** @test */
    public function authorized_users_can_delete_returns_and_reverse_inventory()
    {
        // 1. Initial stock is 10
        $initialStock = Inventory::where('variant_id', $this->variant->id)
            ->value('current_stock');
        $this->assertEquals(10, $initialStock);

        // 2. Perform the delete
        $response = $this->actingAs($this->adminUser)
            ->delete(route('finance.returns.destroy', $this->productReturn->id));

        // 3. Assert redirect and redirect success
        $response->assertRedirect(route('finance.returns.index'));
        $this->assertEquals('Product Return RET001 deleted successfully.', session('success'));

        // 4. Assert DB cleanup
        $this->assertDatabaseMissing('product_returns', [
            'id' => $this->productReturn->id,
        ]);
        $this->assertDatabaseMissing('product_return_items', [
            'product_return_id' => $this->productReturn->id,
        ]);

        // 5. Assert stock was deducted (returned quantity of 1 is deducted, so stock becomes 9)
        $newStock = Inventory::where('variant_id', $this->variant->id)
            ->value('current_stock');
        $this->assertEquals(9, $newStock);
    }
}
