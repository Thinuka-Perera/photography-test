<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Employee;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Bill;
use App\Modules\Shops\Models\Shop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosInvoiceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private Shop $shop;
    private ProductVariant $variant;
    private Employee $employee;

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
        $adminRole = \App\Models\Role::updateOrCreate(['slug' => 'super_admin'], [
            'name' => 'Super Admin',
            'permissions' => ['*'],
            'sort_order' => 1,
        ]);

        // 3. Create User
        $this->adminUser = User::factory()->create([
            'email' => 'admin@gmail.com',
            'role_id' => $adminRole->id,
            'last_shop_id' => $this->shop->id,
        ]);

        // 4. Create Employee
        $this->employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => 'Test Employee',
            'designation' => 'Ed',
            'is_active' => true,
        ]);

        // 5. Create Category
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Custom Frames',
        ]);

        // 6. Create Product
        $product = Product::create([
            'shop_id' => $this->shop->id,
            'category_id' => $category->id,
            'name' => 'Premium Wood Frame',
            'type' => 'frame',
        ]);

        // 7. Create Product Variant
        $this->variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'FRM-WD-12X18',
            'selling_price' => 2500.00,
        ]);

        // 8. Set initial stock
        $this->variant->inventory()->update([
            'current_stock' => 50,
        ]);
    }

    /** @test */
    public function it_fetches_pending_manual_invoices_on_pos_index()
    {
        $this->actingAs($this->adminUser);

        // Create a pending manual invoice
        $pendingInvoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-1001',
            'customer_name' => 'Nadeesha Perera',
            'status' => 'draft',
            'total_amount' => 5000.00,
            'created_by' => $this->adminUser->id,
        ]);

        // Create a paid/linked invoice which should NOT show up
        $paidInvoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-1002',
            'customer_name' => 'Nadeesha Perera',
            'status' => 'paid',
            'sale_id' => 9999,
            'total_amount' => 5000.00,
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->get(route('studio.pos.index'));
        $response->assertStatus(200);

        // Assert Inertia page contains manualInvoices list
        $response->assertInertia(function ($page) use ($pendingInvoice, $paidInvoice) {
            $manualInvoices = $page->toArray()['props']['manualInvoices'] ?? [];
            $this->assertCount(1, $manualInvoices);
            $this->assertEquals($pendingInvoice->id, $manualInvoices[0]['id']);
        });
    }

    /** @test */
    public function it_checks_out_pos_bill_associated_with_manual_invoice_correctly()
    {
        $this->actingAs($this->adminUser);

        // Create manual/pending invoice
        $invoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-2001',
            'customer_name' => 'Kusal Janith',
            'customer_phone' => '0779876543',
            'status' => 'draft',
            'total_amount' => 2500.00,
            'created_by' => $this->adminUser->id,
        ]);

        $invoiceItem = $invoice->items()->create([
            'description' => 'Premium Wood Frame (WD-12X18)',
            'quantity' => 1,
            'unit_price' => 2500.00,
            'product_id' => $this->variant->id,
            'product_sku' => $this->variant->sku,
        ]);

        // Submit checkout payload referencing the invoice_id
        $payload = [
            'items' => [
                [
                    'category_id' => null,
                    'is_stock_item' => true,
                    'stock_item_id' => $this->variant->id,
                    'description' => 'Premium Wood Frame (WD-12X18)',
                    'quantity' => 1,
                    'unit_price' => 2500.00,
                    'discount_type' => 'amount',
                    'discount_value' => 0,
                ]
            ],
            'discount_amount' => 0,
            'editor_id' => $this->employee->id,
            'commission_pct' => 10,
            'is_commission_applicable' => true,
            'payment_method' => 'cash',
            'customer_name' => 'Kusal Janith',
            'customer_phone' => '0779876543',
            'paid_amount' => 2500.00,
            'creation_charge' => 0,
            'invoice_id' => $invoice->id,
            'front_officer_id' => $this->employee->id,
        ];

        // Stock count before POS checkout
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 50,
        ]);

        $response = $this->post(route('studio.pos.commit'), $payload, [
            'X-POS-Commit' => '1',
            'Accept' => 'application/json'
        ]);

        $response->assertStatus(200);

        // Verify the Invoice is linked, has sale_id set, and status is paid
        $invoice = $invoice->fresh();
        $this->assertEquals('paid', $invoice->status);
        $this->assertNotNull($invoice->sale_id);

        // Verify POS Sale exists
        $this->assertDatabaseHas('sales', [
            'id' => $invoice->sale_id,
            'customer_name' => 'Kusal Janith',
            'total_amount' => 2500.00,
        ]);

        // Verify stock deducted exactly once (from 50 down to 49)
        $this->assertDatabaseHas('inventory', [
            'variant_id' => $this->variant->id,
            'current_stock' => 49,
        ]);
    }

    /** @test */
    public function it_appends_invoice_number_reference_to_pos_flash()
    {
        $this->actingAs($this->adminUser);

        $invoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-PH-3001',
            'customer_name' => 'Kamal Silva',
            'status' => 'draft',
            'total_amount' => 1000.00,
            'created_by' => $this->adminUser->id,
        ]);

        $bill = Bill::create([
            'shop_id' => $this->shop->id,
            'bill_number' => '10005',
            'status' => 'delivered',
            'payment_method' => 'cash',
            'subtotal' => 1000.00,
            'discount_amount' => 0,
            'after_discount' => 1000.00,
            'paid_amount' => 1000.00,
            'created_by' => $this->employee->id,
        ]);

        $sale = \App\Models\Sale::create([
            'shop_id' => $this->shop->id,
            'sale_number' => 'SALE-10005',
            'payment_method' => 'cash',
            'subtotal' => 1000.00,
            'discount_amount' => 0,
            'total_amount' => 1000.00,
            'status' => 'completed',
            'cashier_id' => $this->adminUser->id,
        ]);

        // Link them
        $invoice->update([
            'sale_id' => $sale->id,
            'status' => 'paid',
        ]);

        // Call flash route
        $response = $this->get(route('studio.bills.pos-flash', $bill->id));
        $response->assertStatus(200);
        $response->assertJsonPath('bill.invoice_number', 'INV-PH-3001');
    }
}
