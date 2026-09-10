<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Employee;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceInventoryTest extends TestCase
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
            'permissions' => ['invoices'],
            'sort_order' => 1,
        ]);

        // 3. Create User
        $this->adminUser = User::factory()->create([
            'email' => 'admin@gmail.com',
            'role_id' => $adminRole->id,
            'last_shop_id' => $this->shop->id,
        ]);

        // 4. Create Category
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Custom Frames',
        ]);

        // 5. Create Product
        $product = Product::create([
            'shop_id' => $this->shop->id,
            'category_id' => $category->id,
            'name' => 'Premium Wood Frame',
            'type' => 'frame',
        ]);

        // 6. Create Product Variant
        $this->variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'FRM-WD-12X18',
            'selling_price' => 2500.00,
        ]);

        // 7. Set initial stock
        $this->variant->inventory()->update([
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_saves_product_link_attributes_on_invoice_and_does_not_affect_inventory()
    {
        $this->actingAs($this->adminUser);

        $payload = [
            'customer_name' => 'Nadeesha Perera',
            'customer_phone' => '0771234567',
            'employee_id' => $this->adminUser->id,
            'module' => 'photography',
            'notes' => 'Some testing note',
            'due_date' => '2026-09-01',
            'items' => [
                [
                    'description' => 'Premium Wood Frame (WD-12X18)',
                    'quantity' => 2,
                    'unit_price' => 2500.00,
                    'discount_pct' => 10,
                    'product_id' => $this->variant->id,
                    'product_sku' => $this->variant->sku,
                ]
            ],
            'advance_payments' => []
        ];

        $response = $this->post(route('finance.invoices.store'), $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        // Subtotal after discount: 2 * 2500 * 0.9 = 4500
        $this->assertDatabaseHas('invoices', [
            'customer_name' => 'Nadeesha Perera',
            'customer_phone' => '0771234567',
            'subtotal' => 4500.00,
            'total_amount' => 4500.00,
            'status' => 'draft',
        ]);

        $this->assertDatabaseHas('invoice_items', [
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
            'quantity' => 2,
            'unit_price' => 2500.00,
            'discount_pct' => 10.00,
            'line_total' => 4500.00,
        ]);

        // Assert stock remains unchanged
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_retains_product_attributes_on_invoice_update_and_does_not_affect_inventory()
    {
        $this->actingAs($this->adminUser);

        $invoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-9999',
            'customer_name' => 'Original Customer',
            'employee_id' => $this->adminUser->id,
            'module' => 'photography',
            'subtotal' => 2500.00,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 2500.00,
            'status' => 'draft',
            'created_by' => $this->adminUser->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Original Item',
            'quantity' => 1,
            'unit_price' => 2500.00,
            'line_total' => 2500.00,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
        ]);

        $payload = [
            'customer_name' => 'Updated Customer',
            'customer_phone' => '0771234567',
            'employee_id' => $this->adminUser->id,
            'module' => 'photography',
            'status' => 'sent',
            'notes' => 'Updated notes',
            'due_date' => '2026-10-01',
            'items' => [
                [
                    'description' => 'Premium Wood Frame (WD-12X18) - Updated qty',
                    'quantity' => 3,
                    'unit_price' => 2500.00,
                    'discount_pct' => 0,
                    'product_id' => $this->variant->id,
                    'product_sku' => $this->variant->sku,
                ]
            ],
            'advance_payments' => []
        ];

        $response = $this->put(route('finance.invoices.update', $invoice->id), $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'customer_name' => 'Updated Customer',
            'status' => 'sent',
            'subtotal' => 7500.00,
            'total_amount' => 7500.00,
        ]);

        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'description' => 'Premium Wood Frame (WD-12X18) - Updated qty',
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
            'quantity' => 3,
        ]);

        // Assert stock remains unchanged
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_deducts_stock_when_invoice_created_with_status_paid()
    {
        $this->actingAs($this->adminUser);

        $payload = [
            'customer_name' => 'Paid Customer',
            'customer_phone' => '0771234567',
            'employee_id' => $this->adminUser->id,
            'module' => 'photography',
            'status' => 'paid',
            'notes' => 'Invoice created as paid',
            'due_date' => '2026-09-01',
            'items' => [
                [
                    'description' => 'Premium Wood Frame (WD-12X18)',
                    'quantity' => 5,
                    'unit_price' => 2500.00,
                    'discount_pct' => 0,
                    'product_id' => $this->variant->id,
                    'product_sku' => $this->variant->sku,
                ]
            ],
            'advance_payments' => []
        ];

        // Perform request
        $response = $this->post(route('finance.invoices.store'), $payload);
        $response->assertSessionHasNoErrors();

        // Assert stock became: 50 - 5 = 45
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 45,
        ]);
    }

    /** @test */
    public function it_deducts_stock_when_status_updated_to_partially_paid()
    {
        $this->actingAs($this->adminUser);

        $invoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-1111',
            'customer_name' => 'Draft Status Customer',
            'employee_id' => $this->adminUser->id,
            'module' => 'photography',
            'subtotal' => 2500.00,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 2500.00,
            'status' => 'draft',
            'created_by' => $this->adminUser->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'item',
            'quantity' => 10,
            'unit_price' => 250.00,
            'line_total' => 2500.00,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
        ]);

        // Stock starts at 50, stays at 50 because status is draft.
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);

        // Update status to partially_paid
        $payload = [
            'status' => 'partially_paid',
            'items' => [
                [
                    'description' => 'item',
                    'quantity' => 10,
                    'unit_price' => 250.00,
                    'discount_pct' => 0,
                    'product_id' => $this->variant->id,
                    'product_sku' => $this->variant->sku,
                ]
            ]
        ];

        $response = $this->put(route('finance.invoices.update', $invoice->id), $payload);
        $response->assertSessionHasNoErrors();

        // Stock should be deducted: 50 - 10 = 40
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 40,
        ]);
    }

    /** @test */
    public function it_restores_stock_when_invoice_is_cancelled()
    {
        $this->actingAs($this->adminUser);

        $invoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-2222',
            'customer_name' => 'Paid Customer To Delete',
            'employee_id' => $this->adminUser->id,
            'module' => 'photography',
            'subtotal' => 2500.00,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 2500.00,
            'status' => 'partially_paid',
            'created_by' => $this->adminUser->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'item',
            'quantity' => 6,
            'unit_price' => 250.00,
            'line_total' => 1500.00,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
        ]);

        // Manually trigger initial deduction since we did direct model creation above
        $this->variant->inventory()->update([
            'current_stock' => 44, // 50 - 6
        ]);

        // Cancel (delete) the invoice
        $response = $this->delete(route('finance.invoices.destroy', $invoice->id));
        $response->assertSessionHasNoErrors();

        // Stock should be restored back to 50
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_restores_stock_when_invoice_is_fully_refunded()
    {
        $this->actingAs($this->adminUser);

        $invoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-3333',
            'customer_name' => 'Paid Customer to Refund',
            'employee_id' => $this->adminUser->id,
            'module' => 'photography',
            'subtotal' => 2500.00,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 2500.00,
            'status' => 'paid',
            'created_by' => $this->adminUser->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'item',
            'quantity' => 8,
            'unit_price' => 250.00,
            'line_total' => 2000.00,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
        ]);

        // Manually trigger initial stock deduction (mocking creation behavior since we used raw Eloquent create)
        $this->variant->inventory()->update([
            'current_stock' => 42, // 50 - 8
        ]);

        // Process refund
        $payload = [
            'amount' => 2500.00,
            'reason' => 'Defective products returned',
        ];

        $response = $this->post(route('finance.invoices.refund', $invoice->id), $payload);
        $response->assertSessionHasNoErrors();

        // Stock should be restored back to 50
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);
    }
}
