<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Bill;
use App\Models\BillItem;
use App\Models\Employee;
use App\Models\ProductReturn;
use App\Models\ProductReturnItem;
use App\Models\ProductVariant;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductReturnTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Shop $shop;
    private Employee $employee;

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
    }

    public function test_user_can_view_returns_page(): void
    {
        $response = $this->actingAs($this->user)->get(route('finance.returns.index'));
        $response->assertOk();
    }

    public function test_user_can_submit_valid_product_return_for_invoice(): void
    {
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Frames',
            'type' => 'frame',
        ]);

        $product = Product::create([
            'shop_id' => $this->shop->id,
            'name' => 'Custom Frame',
            'category_id' => $category->id,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-RET-01',
            'cost_price' => 100,
            'selling_price' => 250,
            'stock_critical_level' => 2,
        ]);

        $inventory = $variant->inventory;
        $inventory->update([
            'current_stock' => 5,
        ]);

        $invoice = Invoice::create([
            'shop_id' => $this->shop->id,
            'invoice_number' => 'INV-2026-0001',
            'customer_name' => 'Kamal Silva',
            'customer_phone' => '0772223334',
            'module' => 'general',
            'total_amount' => 500,
            'status' => 'paid',
            'created_by' => $this->user->id,
        ]);

        $invoiceItem = InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'product_id' => $variant->id,
            'product_sku' => 'SKU-RET-01',
            'description' => 'Custom Frame Variant',
            'quantity' => 2,
            'unit_price' => 250,
            'total_price' => 500,
        ]);

        $response = $this->actingAs($this->user)->post(route('finance.returns.store'), [
            'transaction_type' => 'invoice',
            'transaction_id' => $invoice->id,
            'reason' => 'Defective frame glass',
            'items' => [
                [
                    'product_id' => $variant->id,
                    'quantity' => 1,
                    'unit_price' => 250,
                ]
            ]
        ]);

        $response->assertRedirect(route('finance.returns.index'));
        $this->assertDatabaseHas('product_returns', [
            'invoice_id' => $invoice->id,
            'customer_name' => 'Kamal Silva',
            'total_amount' => 250,
            'reason' => 'Defective frame glass',
        ]);

        $this->assertEquals(6, $inventory->fresh()->current_stock);
    }

    public function test_user_can_submit_valid_product_return_for_pos_bill(): void
    {
        $category = Category::create([
            'shop_id' => $this->shop->id,
            'name' => 'Frames',
            'type' => 'frame',
        ]);

        $product = Product::create([
            'shop_id' => $this->shop->id,
            'name' => 'Custom Frame',
            'category_id' => $category->id,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-RET-02',
            'cost_price' => 120,
            'selling_price' => 300,
            'stock_critical_level' => 2,
        ]);

        $inventory = $variant->inventory;
        $inventory->update([
            'current_stock' => 10,
        ]);

        $bill = Bill::create([
            'shop_id' => $this->shop->id,
            'bill_number' => 'BILL-2026-0001',
            'customer_name' => 'Nimal Perera',
            'customer_phone' => '0775556667',
            'status' => 'delivered',
            'created_by' => $this->employee->id,
            'paid_amount' => 600,
            'subtotal' => 600,
            'after_discount' => 600,
        ]);

        $billItem = BillItem::create([
            'bill_id' => $bill->id,
            'stock_item_id' => $inventory->id,
            'description' => 'Custom Frame Variant Black',
            'quantity' => 2,
            'unit_price' => 300,
            'line_total' => 600,
            'is_stock_item' => true,
        ]);

        $response = $this->actingAs($this->user)->post(route('finance.returns.store'), [
            'transaction_type' => 'sale',
            'transaction_id' => $bill->id,
            'reason' => 'Wrong frame color delivered',
            'items' => [
                [
                    'product_id' => $variant->id,
                    'quantity' => 1,
                    'unit_price' => 300,
                ]
            ]
        ]);

        $response->assertRedirect(route('finance.returns.index'));
        $this->assertDatabaseHas('product_returns', [
            'sale_id' => $bill->id,
            'customer_name' => 'Nimal Perera',
            'total_amount' => 300,
            'reason' => 'Wrong frame color delivered',
        ]);

        $this->assertEquals(11, $inventory->fresh()->current_stock);
    }
}
