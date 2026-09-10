<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\BillItem;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Category;
use App\Models\ProductVariant;
use App\Modules\Shops\Models\Shop;
use App\Services\BillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductReportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Shop $shop;
    private Employee $employee;
    private BillService $billService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shop = Shop::where('slug', 'main')->first() ?? Shop::create([
            'slug' => 'main',
            'name' => 'Main Studio',
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->app->instance(Shop::class, $this->shop);

        $adminRole = Role::firstOrCreate(
            ['slug' => 'super_admin'],
            [
                'name' => 'Super Admin',
                'permissions' => ['*'],
            ]
        );

        $this->user = User::factory()->create([
            'last_shop_id' => $this->shop->id,
            'role_id' => $adminRole->id,
        ]);

        $this->employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->billService = app(BillService::class);
    }

    public function test_product_reports_uses_net_revenue_and_preserves_on_edit(): void
    {
        // 1. Setup inventory & product variant
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Frames',
            'type' => 'frame',
        ]);

        $product = Product::create([
            'shop_id' => $this->shop->id,
            'name' => 'Test Frame Product',
            'category_id' => $category->id,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-TEST-01',
            'cost_price' => 100,
            'selling_price' => 300,
            'stock_critical_level' => 1,
        ]);

        // Boot generated the inventory record automatically. Load/update stock.
        $inventory = $variant->inventory;
        $inventory->update(['current_stock' => 10]);

        // 2. Commit a POS sale with a discount. Let's make it:
        // Quantity: 2, Unit Price: 300 => Raw Total: 600.
        // Discount 50 LKR => Discount Amount: 50. Line Total: 550.
        $bill = $this->billService->createBill([
            'created_by' => $this->employee->id,
            'status' => 'processing',
            'items' => [
                [
                    'is_stock_item' => true,
                    'stock_item_id' => $inventory->id,
                    'description' => 'Test Frame Product',
                    'quantity' => 2,
                    'unit_price' => 300,
                    'discount_type' => 'amount',
                    'discount_value' => 50,
                ]
            ],
            'discount_amount' => 0,
            'paid_amount' => 550,
            'payment_method' => 'cash',
        ]);

        // 3. Act - Get standard Product Reports index and check net revenue is sums(line_total) = 550 instead of 600
        $response = $this->actingAs($this->user)
            ->get(route('reports.products'));

        $response->assertStatus(200);

        $productsData = $response->original->getData()['page']['props']['products'] ?? [];
        $stats = $response->original->getData()['page']['props']['stats'] ?? [];

        $this->assertCount(1, $productsData);
        $this->assertEquals(2, $productsData[0]->units_sold);
        // Correct net revenue should be 550.00 (from line_total) not 600.00 (quantity * unit_price)
        $this->assertEquals(550.00, $productsData[0]->revenue);
        $this->assertEquals(550.00, $stats['total_revenue']);

        // 4. Update the bill - preserving stock items
        $updatePayload = [
            'items' => [
                [
                    'category_id' => null,
                    'is_stock_item' => true,
                    'stock_item_id' => $inventory->id,
                    'description' => 'Test Frame Product (Updated)',
                    'quantity' => 3, // quantity updated to 3
                    'unit_price' => 300,
                    'discount_type' => 'amount',
                    'discount_value' => 100, // discount updated to 100
                ]
            ],
            'discount_amount' => 0,
            'editor_id' => null,
            'commission_pct' => 15,
            'is_commission_applicable' => true,
            'notes' => 'Updated via test',
        ];

        // Put request to update bill
        $updateResponse = $this->actingAs($this->user)
            ->put(route('studio.bills.update', $bill->id), $updatePayload);

        $updateResponse->assertSessionHasNoErrors();
        $updateResponse->assertRedirect();

        // 5. Verify database preserves stock item mapping
        $this->assertDatabaseHas('bill_items', [
            'bill_id' => $bill->id,
            'is_stock_item' => true,
            'stock_item_id' => $inventory->id,
            'quantity' => 3.00,
            'unit_price' => 300.00,
            'discount_amount' => 300.00, // 100 * 3
            'line_total' => 600.00, // (3 * 300) - 300 = 600
        ]);

        // 6. Fetch reports again and check updated stats represent the changes
        $reResponse = $this->actingAs($this->user)
            ->get(route('reports.products'));

        $reResponse->assertStatus(200);

        $reProductsData = $reResponse->original->getData()['page']['props']['products'] ?? [];
        $reStats = $reResponse->original->getData()['page']['props']['stats'] ?? [];

        $this->assertCount(1, $reProductsData);
        $this->assertEquals(3, $reProductsData[0]->units_sold);
        $this->assertEquals(600.00, $reProductsData[0]->revenue);
        $this->assertEquals(600.00, $reStats['total_revenue']);
    }
}
