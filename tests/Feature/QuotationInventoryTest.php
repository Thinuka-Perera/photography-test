<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuotationInventoryTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private Shop $shop;
    private ProductVariant $variant;

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
        $adminRole = \App\Models\Role::updateOrCreate(['slug' => 'admin'], [
            'name' => 'Admin',
            'permissions' => ['quotations'],
            'sort_order' => 1,
        ]);

        // 3. Create User
        $this->adminUser = User::factory()->create([
            'email' => 'admin@gmail.com',
            'role_id' => $adminRole->id,
            'last_shop_id' => $this->shop->id,
        ]);

        // 3. Create raw category (Category doesn't use HasFactory)
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Custom Frames',
        ]);

        // 4. Create Product
        $product = Product::create([
            'shop_id' => $this->shop->id,
            'category_id' => $category->id,
            'name' => 'Premium Wood Frame',
            'type' => 'frame',
        ]);

        // 5. Create Product Variant
        $this->variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'FRM-WD-12X18',
            'selling_price' => 2500.00,
        ]);

        // 6. Create custom employee representing editor/creator
        Employee::create([
            'shop_id' => $this->shop->id,
            'name' => 'Editor User',
            'user_id' => $this->adminUser->id,
            'job_role' => 'editor',
        ]);

        // 7. Set initial stock on the auto-created inventory record
        $this->variant->inventory()->update([
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_saves_product_link_attributes_on_quotation_and_does_not_affect_inventory()
    {
        $this->actingAs($this->adminUser);

        $payload = [
            'customer_name' => 'Sunil Perera',
            'customer_phone' => '0779876543',
            'event_type' => 'Wedding',
            'event_date' => '2026-06-01',
            'status' => 'draft',
            'discount_amount' => 200,
            'line_items' => [
                [
                    'description' => 'Premium Wood Frame (WD-12X18)',
                    'quantity' => 2,
                    'unit_price' => 2500.00,
                    'product_id' => $this->variant->id,
                    'product_sku' => $this->variant->sku,
                ]
            ]
        ];

        $response = $this->post(route('photography.quotations.store'), $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        // Assert Quotation is stored
        $this->assertDatabaseHas('quotations', [
            'customer_name' => 'Sunil Perera',
            'subtotal' => 5000.00,
            'discount_amount' => 200.00,
            'total_amount' => 4800.00,
        ]);

        // Assert Quotation Item links to the product and sku
        $this->assertDatabaseHas('quotation_items', [
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
            'quantity' => 2,
        ]);

        // Assert stock remains exactly 50 (i.e. not affected by quotation creation)
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_retains_product_attributes_on_update_and_does_not_affect_inventory()
    {
        $this->actingAs($this->adminUser);

        $quotation = Quotation::create([
            'shop_id' => $this->shop->id,
            'quote_number' => 'QT-TEST-0001',
            'customer_name' => 'Shanil',
            'event_type' => 'Homecoming',
            'status' => 'draft',
            'subtotal' => 2500.00,
            'discount_amount' => 0,
            'total_amount' => 2500.00,
        ]);

        $item = QuotationItem::create([
            'quotation_id' => $quotation->id,
            'description' => 'Wood Frame',
            'quantity' => 1,
            'unit_price' => 2500.00,
            'line_total' => 2500.00,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
        ]);

        $payload = [
            'customer_name' => 'Shanil Updated',
            'customer_phone' => '0779876543',
            'event_type' => 'Homecoming',
            'event_date' => '2026-06-01',
            'status' => 'approved',
            'discount_amount' => 0,
            'line_items' => [
                [
                    'description' => 'Premium Wood Frame (WD-12X18) - Updated qty',
                    'quantity' => 4,
                    'unit_price' => 2500.00,
                    'product_id' => $this->variant->id,
                    'product_sku' => $this->variant->sku,
                ]
            ]
        ];

        $response = $this->put(route('photography.quotations.update', $quotation->id), $payload);
        $response->assertRedirect();

        // Assert Quotation Item is updated and product information updated/retained
        $this->assertDatabaseHas('quotation_items', [
            'quotation_id' => $quotation->id,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
            'quantity' => 4,
        ]);

        // Assert stock remains exactly 50 (i.e. not affected by quotation update)
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_transfers_product_fields_when_converting_to_invoice_without_stock_deduction()
    {
        $quotation = Quotation::create([
            'shop_id' => $this->shop->id,
            'quote_number' => 'QT-TEST-0002',
            'customer_name' => 'Conversion Customer',
            'event_type' => 'Wedding',
            'status' => 'approved',
            'subtotal' => 5000.00,
            'discount_amount' => 0,
            'total_amount' => 5000.00,
        ]);

        $qItem = QuotationItem::create([
            'quotation_id' => $quotation->id,
            'description' => 'Premium Wood Frame',
            'quantity' => 2,
            'unit_price' => 2500.00,
            'line_total' => 5000.00,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
        ]);

        $invoiceService = $this->app->make(InvoiceService::class);
        $invoice = $invoiceService->createFromQuotation(
            quotation: $quotation,
            employeeId: $this->adminUser->id,
            createdBy: $this->adminUser->id,
            taxRate: 0
        );

        $this->assertNotNull($invoice);
        $this->assertEquals($quotation->id, $invoice->quotation_id);

        // Assert Invoice Item contains copied product fields
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
            'quantity' => 2,
        ]);

        // Assert stock remains exactly 50 (no stock deduction on quotation -> invoice conversion)
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);
    }
}
