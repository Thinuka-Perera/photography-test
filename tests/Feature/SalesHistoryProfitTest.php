<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\BillItem;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesHistoryProfitTest extends TestCase
{
    use RefreshDatabase;

    private Shop $shop;

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
    }

    public function test_admin_can_view_sales_history_with_profit(): void
    {
        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Admin',
                'permissions' => ['sales-history', 'dashboard'],
            ]
        );

        $adminUser = User::factory()->create([
            'last_shop_id' => $this->shop->id,
            'role_id' => $adminRole->id,
        ]);

        $employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $adminUser->name,
            'email' => $adminUser->email,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $bill = Bill::create([
            'bill_number' => 'REC-10001',
            'shop_id' => $this->shop->id,
            'created_by' => $employee->id,
            'status' => 'completed',
            'subtotal' => 500,
            'discount_amount' => 50,
            'after_discount' => 450,
            'paid_amount' => 450,
            'balance_due' => 0,
            'payment_method' => 'cash',
        ]);

        BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom frame A',
            'quantity' => 2,
            'unit_price' => 250,
            'line_total' => 500,
            'cost' => 150,
        ]);

        $response = $this->actingAs($adminUser)
            ->get(route('studio.sales.index'));

        $response->assertStatus(200);

        $sales = $response->original->getData()['page']['props']['sales']['data'] ?? [];
        $canViewProfit = $response->original->getData()['page']['props']['canViewProfit'] ?? null;

        $this->assertTrue($canViewProfit);
        $this->assertCount(1, $sales);
        $this->assertEquals(150.00, $sales[0]['profit']);
    }

    public function test_cashier_cannot_view_profit_in_sales_history(): void
    {
        $cashierRole = Role::firstOrCreate(
            ['slug' => 'cashier'],
            [
                'name' => 'Cashier',
                'permissions' => ['sales-history'],
            ]
        );

        $cashierUser = User::factory()->create([
            'last_shop_id' => $this->shop->id,
            'role_id' => $cashierRole->id,
        ]);

        $employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $cashierUser->name,
            'email' => $cashierUser->email,
            'role' => 'cashier',
            'status' => 'active',
        ]);

        $bill = Bill::create([
            'bill_number' => 'REC-10002',
            'shop_id' => $this->shop->id,
            'created_by' => $employee->id,
            'status' => 'completed',
            'subtotal' => 500,
            'discount_amount' => 50,
            'after_discount' => 450,
            'paid_amount' => 450,
            'balance_due' => 0,
            'payment_method' => 'cash',
        ]);

        BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom frame A',
            'quantity' => 2,
            'unit_price' => 250,
            'line_total' => 500,
            'cost' => 150,
        ]);

        $response = $this->actingAs($cashierUser)
            ->get(route('studio.sales.index'));

        $response->assertStatus(200);

        $sales = $response->original->getData()['page']['props']['sales']['data'] ?? [];
        $canViewProfit = $response->original->getData()['page']['props']['canViewProfit'] ?? null;

        $this->assertFalse($canViewProfit);
        $this->assertCount(1, $sales);
        $this->assertNull($sales[0]['profit']);
    }

    public function test_credit_bill_status_reflects_settled_outstanding_overdue_in_sales_history(): void
    {
        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin', 'permissions' => ['sales-history']]
        );

        $adminUser = User::factory()->create([
            'last_shop_id' => $this->shop->id,
            'role_id' => $adminRole->id,
        ]);

        $employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $adminUser->name,
            'email' => $adminUser->email,
            'role' => 'admin',
            'status' => 'active',
        ]);

        // Outstanding credit bill
        $bill1 = Bill::create([
            'bill_number' => 'BILL-2481',
            'shop_id' => $this->shop->id,
            'created_by' => $employee->id,
            'status' => 'delivered',
            'subtotal' => 3500,
            'after_discount' => 3500,
            'paid_amount' => 0,
            'balance_due' => 3500,
            'payment_method' => 'credit',
        ]);
        \App\Models\CreditBill::create([
            'shop_id' => $this->shop->id,
            'bill_id' => $bill1->id,
            'type' => 'credit',
            'customer_name' => 'Nuvini',
            'total_amount' => 3500,
            'paid_amount' => 0,
            'balance_amount' => 3500,
            'promise_date' => today()->addDays(2),
            'status' => 'outstanding',
            'created_by' => $employee->id,
        ]);

        // Overdue credit bill
        $bill2 = Bill::create([
            'bill_number' => 'BILL-2472',
            'shop_id' => $this->shop->id,
            'created_by' => $employee->id,
            'status' => 'delivered',
            'subtotal' => 2475,
            'after_discount' => 2475,
            'paid_amount' => 0,
            'balance_due' => 2475,
            'payment_method' => 'credit',
        ]);
        \App\Models\CreditBill::create([
            'shop_id' => $this->shop->id,
            'bill_id' => $bill2->id,
            'type' => 'credit',
            'customer_name' => 'Akila',
            'total_amount' => 2475,
            'paid_amount' => 0,
            'balance_amount' => 2475,
            'promise_date' => today()->subDays(2),
            'status' => 'outstanding',
            'created_by' => $employee->id,
        ]);

        // Settled credit bill
        $bill3 = Bill::create([
            'bill_number' => 'BILL-2477',
            'shop_id' => $this->shop->id,
            'created_by' => $employee->id,
            'status' => 'delivered',
            'subtotal' => 1370,
            'after_discount' => 1370,
            'paid_amount' => 1370,
            'balance_due' => 0,
            'payment_method' => 'credit',
        ]);
        \App\Models\CreditBill::create([
            'shop_id' => $this->shop->id,
            'bill_id' => $bill3->id,
            'type' => 'credit',
            'customer_name' => 'Duneth',
            'total_amount' => 1370,
            'paid_amount' => 1370,
            'balance_amount' => 0,
            'promise_date' => today(),
            'status' => 'settled',
            'created_by' => $employee->id,
        ]);

        $response = $this->actingAs($adminUser)->get(route('studio.sales.index'));
        $sales = collect($response->original->getData()['page']['props']['sales']['data'] ?? []);

        $sale1 = $sales->firstWhere('bill_number', 'BILL-2481');
        $sale2 = $sales->firstWhere('bill_number', 'BILL-2472');
        $sale3 = $sales->firstWhere('bill_number', 'BILL-2477');

        $this->assertEquals('outstanding', $sale1['status'] ?? null);
        $this->assertEquals('overdue', $sale2['status'] ?? null);
        $this->assertEquals('settled', $sale3['status'] ?? null);
    }
}
