<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Bill;
use App\Models\BillItem;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\Role;
use App\Models\SalaryProfile;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CustomEntryReportTest extends TestCase
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

        $superAdminRoleId = Role::query()->where('slug', 'super_admin')->value('id') ?? Role::create([
            'slug' => 'super_admin',
            'name' => 'Super Admin',
            'permissions' => [],
        ])->id;

        $this->user = User::factory()->create([
            'last_shop_id' => $this->shop->id,
            'role_id' => $superAdminRoleId,
        ]);

        $this->employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'role' => 'cashier',
            'status' => 'active',
        ]);
    }

    public function test_custom_entry_reports_displays_profit_calculations(): void
    {
        $bill = Bill::create([
            'bill_number' => 'REC-00001',
            'shop_id' => $this->shop->id,
            'created_by' => $this->employee->id,
            'status' => 'delivered',
            'subtotal' => 450,
            'discount_amount' => 0,
            'after_discount' => 450,
            'paid_amount' => 450,
            'balance_due' => 0,
            'payment_method' => 'cash',
        ]);

        // Item 1: quantity = 2, unit_price = 150, line_total = 300, cost = 50. Profit = 300 - (50 * 2) = 200.
        $item1 = BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom design frame A',
            'quantity' => 2,
            'unit_price' => 150,
            'line_total' => 300,
            'cost' => 50,
        ]);

        // Item 2: quantity = 1, unit_price = 150, line_total = 150, cost = null. Profit = 150 - (0 * 1) = 150.
        $item2 = BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom design frame B',
            'quantity' => 1,
            'unit_price' => 150,
            'line_total' => 150,
            'cost' => null,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('reports.custom-entries'));

        $response->assertStatus(200);

        $items = $response->original->getData()['page']['props']['items'] ?? [];
        $stats = $response->original->getData()['page']['props']['stats'] ?? [];

        $this->assertCount(2, $items);
        
        // Find items in mapped array
        $mappedItem1 = collect($items)->firstWhere('id', $item1->id);
        $mappedItem2 = collect($items)->firstWhere('id', $item2->id);

        $this->assertNotNull($mappedItem1);
        $this->assertNotNull($mappedItem2);

        $this->assertEquals(200.00, $mappedItem1['profit']);
        $this->assertEquals(150.00, $mappedItem2['profit']);
        $this->assertEquals(350.00, $stats['total_profit']);
    }

    public function test_custom_entry_cost_update_route(): void
    {
        $bill = Bill::create([
            'bill_number' => 'REC-00002',
            'shop_id' => $this->shop->id,
            'created_by' => $this->employee->id,
            'status' => 'delivered',
            'subtotal' => 150,
            'discount_amount' => 0,
            'after_discount' => 150,
            'paid_amount' => 150,
            'balance_due' => 0,
            'payment_method' => 'cash',
        ]);

        $item = BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom frame print',
            'quantity' => 1,
            'unit_price' => 150,
            'line_total' => 150,
            'cost' => null,
        ]);

        $response = $this->actingAs($this->user)
            ->patch(route('reports.custom-entries.cost.update', $item->id), [
                'cost' => 80,
            ]);

        $response->assertStatus(302); // Redirects back
        $this->assertEquals(80.00, $item->fresh()->cost);
    }

    public function test_custom_entry_cost_update_compatibility_route(): void
    {
        $bill = Bill::create([
            'bill_number' => 'REC-00003',
            'shop_id' => $this->shop->id,
            'created_by' => $this->employee->id,
            'status' => 'delivered',
            'subtotal' => 150,
            'discount_amount' => 0,
            'after_discount' => 150,
            'paid_amount' => 150,
            'balance_due' => 0,
            'payment_method' => 'cash',
        ]);

        $item = BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom frame print',
            'quantity' => 1,
            'unit_price' => 150,
            'line_total' => 150,
            'cost' => null,
        ]);

        // The URL generated by Inertia for compatibility: post to reports/custom-entries/{id}/cost/update
        $response = $this->actingAs($this->user)
            ->post(route('reports.custom-entries') . '/' . $item->id . '/cost/update', [
                'cost' => 85,
            ]);

        $response->assertStatus(302); // Redirects back
        $this->assertEquals(85.00, $item->fresh()->cost);
    }

    public function test_custom_entry_cost_affects_daily_sales_report(): void
    {
        $bill = Bill::create([
            'bill_number' => 'REC-00004',
            'shop_id' => $this->shop->id,
            'created_by' => $this->employee->id,
            'status' => 'delivered',
            'subtotal' => 450,
            'discount_amount' => 0,
            'after_discount' => 450,
            'paid_amount' => 450,
            'balance_due' => 0,
            'payment_method' => 'cash',
        ]);

        // Custom item 1 with cost
        BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom frame A',
            'quantity' => 2,
            'unit_price' => 150,
            'line_total' => 300,
            'cost' => 50.00,  // Total cost = 100
        ]);

        // Custom item 2 without cost
        BillItem::create([
            'bill_id' => $bill->id,
            'is_stock_item' => false,
            'description' => 'Custom frame B',
            'quantity' => 1,
            'unit_price' => 150,
            'line_total' => 150,
            'cost' => null,   // Total cost = 0
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('reports.daily', [
                'date' => Carbon::today()->toDateString(),
            ]));

        $response->assertStatus(200);

        $totalItemCost = $response->original->getData()['page']['props']['totalItemCost'] ?? null;
        $productsSold = $response->original->getData()['page']['props']['productsSold'] ?? [];

        // Assert that the item cost is correctly sum of custom entry cost (100)
        $this->assertEquals(100.00, $totalItemCost);

        // Assert productsSold profit is correct
        $sold1 = collect($productsSold)->firstWhere('product_name', 'Custom frame A');
        $sold2 = collect($productsSold)->firstWhere('product_name', 'Custom frame B');

        $this->assertNotNull($sold1);
        $this->assertNotNull($sold2);

        // Custom item 1 profit: 300 - 100 = 200
        $this->assertEquals(200.00, $sold1->total_profit);

        // Custom item 2 profit: 150 - 0 = 150
        $this->assertEquals(150.00, $sold2->total_profit);
    }

    public function test_marking_salary_as_paid_records_expense(): void
    {
        $salaryProfile = SalaryProfile::create([
            'employee_id' => $this->employee->id,
            'month' => Carbon::today()->startOfMonth()->toDateString(),
            'basic_salary' => 80000.00,
            'attendance_allowance' => 5000.00,
            'overtime_rate' => 200.00,
            'notes' => 'Test salary profile',
        ]);

        // Creating attendance
        Attendance::create([
            'employee_id' => $this->employee->id,
            'work_date' => Carbon::today()->toDateString(),
            'status' => 'present',
            'check_in_time' => '08:00:00',
            'check_out_time' => '17:00:00',
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('payroll.salaries.pay', $salaryProfile));

        $response->assertStatus(302); // Redirect back

        $salaryProfile->refresh();
        $this->assertNotNull($salaryProfile->paid_at);

        // Check if an expense record was created
        $expense = Expense::where('shop_id', $this->shop->id)
            ->where('category', 'Salaries')
            ->first();

        $this->assertNotNull($expense);
        $this->assertEquals($salaryProfile->employee->shop_id, $expense->shop_id);
        $this->assertEquals(Carbon::today()->toDateString(), $expense->expense_date->toDateString());
        
        $this->assertStringContainsString('Salary payment for', $expense->description);
        $this->assertStringContainsString($this->employee->name, $expense->description);
        $this->assertEquals(85425.00, (float) $expense->amount);
    }
}
