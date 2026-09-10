<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Role;
use App\Modules\Shops\Models\Shop;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DecimalUomStockTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private Shop $shop;
    private ProductVariant $variant;
    private StockService $stockService;

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

        // 2. Create Role with permissions
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], [
            'name' => 'Admin',
            'permissions' => ['inventory', 'pos'],
            'sort_order' => 1,
        ]);

        // 3. Create User
        $this->adminUser = User::factory()->create([
            'email' => 'admin@gmail.com',
            'role_id' => $adminRole->id,
            'last_shop_id' => $this->shop->id,
        ]);

        // 3b. Create Employee associated with User
        \App\Models\Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $this->adminUser->name,
            'email' => $this->adminUser->email,
            'phone' => '0771234567',
            'role' => 'admin',
            'job_role' => 'admin',
            'status' => 'active',
        ]);

        // 4. Create Category
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Raw Materials',
        ]);

        // 5. Create Product with decimal friendly UOM (kg)
        $product = Product::create([
            'shop_id' => $this->shop->id,
            'category_id' => $category->id,
            'name' => 'Resin Powder',
            'uom' => 'kg',
        ]);

        // 6. Create Variant
        $this->variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'RSN-PWD-001',
            'selling_price' => 1200.00,
        ]);

        $this->stockService = app(StockService::class);
    }

    /** @test */
    public function it_supports_decimal_stock_in_and_out_operations()
    {
        $this->actingAs($this->adminUser);

        // 1. Record Stock IN (e.g. 15.75 kg)
        $this->stockService->recordIn(
            shopId: $this->shop->id,
            variantId: $this->variant->id,
            quantity: 15.75,
            reason: 'Purchase',
            notes: 'Initial batch of resin'
        );

        $this->assertEquals(15.75, $this->stockService->getBalance($this->shop->id, $this->variant->id));

        // 2. Record Stock OUT (e.g. 3.25 kg)
        $this->stockService->recordOut(
            shopId: $this->shop->id,
            variantId: $this->variant->id,
            quantity: 3.25,
            reason: 'Sale',
            notes: 'Sold to customer'
        );

        $this->assertEquals(12.50, $this->stockService->getBalance($this->shop->id, $this->variant->id));

        // Verify in database/casts
        $this->assertEquals(12.50, (float) $this->variant->inventory()->value('current_stock'));
    }

    /** @test */
    public function it_validates_and_records_decimal_stock_via_controller_actions()
    {
        $this->actingAs($this->adminUser);

        // Initialize inventory with 5.50
        $this->variant->inventory()->update([
            'current_stock' => 5.50,
        ]);

        // Stock In via HTTP request
        $response = $this->post(route('inventory.stockIn'), [
            'variant_id' => $this->variant->id,
            'quantity' => 10.45,
            'reason' => 'Purchase',
            'date' => now()->format('Y-m-d'),
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals(15.95, (float) $this->variant->inventory()->value('current_stock'));

        // Stock Out via HTTP request
        $response = $this->post(route('inventory.stockOut'), [
            'variant_id' => $this->variant->id,
            'quantity' => 2.22,
            'reason' => 'Adjustment',
            'date' => now()->format('Y-m-d'),
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals(13.73, (float) $this->variant->inventory()->value('current_stock'));
    }

    /** @test */
    public function it_successfully_records_decimal_quantities_during_pos_sales()
    {
        $this->actingAs($this->adminUser);

        // Initialize stock to 50.00 kg
        $this->variant->inventory()->update([
            'current_stock' => 50.00,
        ]);

        // Mock POS commit payload with decimal quantity (1.25 kg)
        $payload = [
            'items' => [
                [
                    'is_stock_item' => true,
                    'stock_item_id' => $this->variant->inventory->id,
                    'description' => 'Resin Powder (RSN-PWD-001)',
                    'quantity' => 1.25,
                    'unit_price' => 1200.00,
                    'discount_type' => 'amount',
                    'discount_value' => 0,
                ]
            ],
            'discount_amount' => 0,
            'editor_id' => null,
            'payment_method' => 'cash',
            'paid_amount' => 1500.00,
            'creation_charge' => 0,
        ];

        $response = $this->post(route('studio.pos.commit'), $payload);
        
        if ($response->status() !== 200) {
            dump($response->json());
        }
        
        $response->assertStatus(200);

        // Assert inventory update: 50.00 - 1.25 = 48.75
        $this->assertEquals(48.75, (float) $this->variant->inventory()->value('current_stock'));

        // Assert stock log records exact decimal quantity
        $this->assertDatabaseHas('stock_logs', [
            'variant_id' => $this->variant->id,
            'quantity' => 1.25,
            'reason' => 'POS Sale',
            'type' => 'OUT',
        ]);
    }
}
