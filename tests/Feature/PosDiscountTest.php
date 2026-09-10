<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\BillItem;
use App\Models\Employee;
use App\Models\User;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Category;
use App\Models\ProductVariant;
use App\Modules\Shops\Models\Shop;
use App\Services\BillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosDiscountTest extends TestCase
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

        $this->user = User::factory()->create([
            'last_shop_id' => $this->shop->id,
        ]);

        $this->employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'role' => 'cashier',
            'status' => 'active',
        ]);

        $this->billService = app(BillService::class);
    }

    public function test_create_bill_calculates_and_stores_item_level_discounts(): void
    {
        // 1. Arrange - Setup category and products/variants
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Frames',
            'type' => 'frame',
        ]);

        $product1 = Product::create([
            'shop_id' => $this->shop->id,
            'name' => 'Classic frame 4x6',
            'category_id' => $category->id,
        ]);

        $variant1 = ProductVariant::create([
            'product_id' => $product1->id,
            'sku' => 'SKU-DISC-01',
            'cost_price' => 100,
            'selling_price' => 200, // unit_price
            'stock_critical_level' => 1,
        ]);

        $variant1->inventory->update(['current_stock' => 10]);

        $product2 = Product::create([
            'shop_id' => $this->shop->id,
            'name' => 'Classic frame 5x7',
            'category_id' => $category->id,
        ]);

        $variant2 = ProductVariant::create([
            'product_id' => $product2->id,
            'sku' => 'SKU-DISC-02',
            'cost_price' => 150,
            'selling_price' => 300, // unit_price
            'stock_critical_level' => 1,
        ]);

        $variant2->inventory->update(['current_stock' => 10]);

        // 2. Act - Create bill with item level discounts
        // Item 1: Quantity: 2, Unit Price: 200 => Line raw total: 400. Discount 10% => Discount amount: 40. Line total: 360.
        // Item 2: Quantity: 1, Unit Price: 300 => Line raw total: 300. Discount amount: 50 LKR => Discount amount: 50. Line total: 250.
        // Order-level (cart) discount: 60 LKR
        // Total subtotal = 400 + 300 = 700.
        // Total discount = 40 + 50 + 60 = 150.
        // Total payable = 700 - 150 = 550.
        $bill = $this->billService->createBill([
            'created_by' => $this->employee->id,
            'status' => 'delivered',
            'items' => [
                [
                    'is_stock_item' => true,
                    'stock_item_id' => $variant1->inventory->id,
                    'description' => 'Classic frame 4x6',
                    'quantity' => 2,
                    'unit_price' => 200,
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                ],
                [
                    'is_stock_item' => true,
                    'stock_item_id' => $variant2->inventory->id,
                    'description' => 'Classic frame 5x7',
                    'quantity' => 1,
                    'unit_price' => 300,
                    'discount_type' => 'amount',
                    'discount_value' => 50,
                ]
            ],
            'discount_amount' => 60, // Order-level/cart discount
            'paid_amount' => 550,
            'payment_method' => 'cash',
        ]);

        // 3. Assert - Check calculations database values
        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'subtotal' => 700.00,
            'discount_amount' => 150.00,
            'after_discount' => 550.00,
            'paid_amount' => 550.00,
            'balance_due' => 0.00,
        ]);

        $this->assertDatabaseHas('bill_items', [
            'bill_id' => $bill->id,
            'stock_item_id' => $variant1->inventory->id,
            'quantity' => 2.00,
            'unit_price' => 200.00,
            'discount_type' => 'percent',
            'discount_value' => 10.00,
            'discount_amount' => 40.00,
            'line_total' => 360.00,
        ]);

        $this->assertDatabaseHas('bill_items', [
            'bill_id' => $bill->id,
            'stock_item_id' => $variant2->inventory->id,
            'quantity' => 1.00,
            'unit_price' => 300.00,
            'discount_type' => 'amount',
            'discount_value' => 50.00,
            'discount_amount' => 50.00,
            'line_total' => 250.00,
        ]);

        // Verify stock is deducted correctly: 10 - 2 = 8, and 10 - 1 = 9
        $this->assertEquals(8, $variant1->inventory->fresh()->current_stock);
        $this->assertEquals(9, $variant2->inventory->fresh()->current_stock);
    }

    public function test_http_store_pos_commit_saves_item_discounts_successfully(): void
    {
        $billCategory = \App\Models\BillCategory::create([
            'shop_id' => $this->shop->id,
            'name' => 'Frames (POS)',
        ]);

        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Frames',
            'type' => 'frame',
        ]);

        $product = Product::create([
            'shop_id' => $this->shop->id,
            'name' => 'Test Frame',
            'category_id' => $category->id,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-DISC-HTTP',
            'cost_price' => 100,
            'selling_price' => 500,
            'stock_critical_level' => 1,
        ]);

        $variant->inventory->update(['current_stock' => 10]);

        $payload = [
            'items' => [
                [
                    'category_id' => $billCategory->id,
                    'is_stock_item' => true,
                    'stock_item_id' => $variant->inventory->id,
                    'description' => 'Test Frame',
                    'quantity' => 1,
                    'unit_price' => 500,
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                ]
            ],
            'discount_amount' => 0,
            'paid_amount' => 450,
            'payment_method' => 'cash',
        ];

        // Perform the HTTP Request representing the checkout session save
        $response = $this->actingAs($this->user)
            ->post(route('studio.pos.commit'), $payload, [
                'X-POS-Commit' => '1',
            ]);

        $response->assertStatus(200);

        // Verify calculations: Subtotal = 500, Discount = 50, after_discount = 450, balance_due = 0
        $this->assertDatabaseHas('bills', [
            'subtotal' => 500.00,
            'discount_amount' => 50.00,
            'after_discount' => 450.00,
            'paid_amount' => 450.00,
            'balance_due' => 0.00,
        ]);

        $this->assertDatabaseHas('bill_items', [
            'stock_item_id' => $variant->inventory->id,
            'quantity' => 1.00,
            'unit_price' => 500.00,
            'discount_type' => 'percent',
            'discount_value' => 10.00,
            'discount_amount' => 50.00,
            'line_total' => 450.00,
        ]);
    }
}
