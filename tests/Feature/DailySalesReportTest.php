<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\CreditBill;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use App\Models\Payment;
use App\Modules\Shops\Models\Shop;
use App\Services\BillService;
use App\Services\CreditBillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DailySalesReportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Shop $shop;
    private Employee $employee;
    private BillService $billService;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Resolve or create default Main shop
        $this->shop = Shop::where('slug', 'main')->first() ?? Shop::create([
            'slug' => 'main',
            'name' => 'Main Studio',
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->app->instance(Shop::class, $this->shop);

        // 2. Setup Super Admin role to bypass EnsurePageAccess middleware
        $adminRole = Role::firstOrCreate(
            ['slug' => 'super_admin'],
            [
                'name' => 'Super Admin',
                'permissions' => ['*'],
            ]
        );

        // 3. Create administrator user
        $this->user = User::factory()->create([
            'last_shop_id' => $this->shop->id,
            'role_id' => $adminRole->id,
        ]);

        // 4. Create matching front officer employee record
        $this->employee = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'role' => 'admin',
            'job_role' => 'front_office',
            'status' => 'active',
        ]);

        $this->billService = app(BillService::class);
    }

    public function test_credit_bill_shows_zero_income_and_correct_breakdown_on_settle(): void
    {
        Carbon::setTestNow('2026-08-10 10:00:00');

        // 1. Create a credit bill for 5000:
        // Discount: 0, Total: 5000, Paid: 0, Balance: 5000.
        $bill = $this->billService->createBill([
            'created_by' => $this->employee->id,
            'status' => 'processing',
            'items' => [
                [
                    'is_stock_item' => false,
                    'description' => 'Custom Photo Design Service',
                    'quantity' => 1,
                    'unit_price' => 5000,
                    'discount_type' => 'amount',
                    'discount_value' => 0,
                ]
            ],
            'discount_amount' => 0,
            'paid_amount' => 0,
            'payment_method' => 'credit',
        ]);

        // Create the CreditBill record to match POS BillController store behavior (created during store/draft stage)
        $creditBill = CreditBill::create([
            'shop_id' => $bill->shop_id,
            'bill_id' => $bill->id,
            'type' => 'credit',
            'customer_name' => $bill->customer_name,
            'customer_phone' => $bill->customer_phone,
            'total_amount' => $bill->after_discount,
            'paid_amount' => 0,
            'balance_amount' => $bill->after_discount,
            'created_by' => $this->employee->id,
            'promise_date' => today()->addDays(7),
            'status' => 'outstanding',
        ]);

        // Inspect report for 2026-08-10. Since it's credit, no payments were recorded.
        // Therefore, Daily Income should be 0 and Payment breakdown empty.
        $reportResponse = $this->actingAs($this->user)
            ->get(route('reports.daily', ['date' => '2026-08-10']));

        $reportResponse->assertStatus(200);
        $summary = $reportResponse->original->getData()['page']['props']['summary'] ?? null;
        $paymentBreakdown = $reportResponse->original->getData()['page']['props']['paymentBreakdown'] ?? [];
        $totalCollection = $reportResponse->original->getData()['page']['props']['totalCollection'] ?? null;

        $this->assertEquals(5000.00, $summary['gross_revenue'] ?? null);
        $this->assertEquals(1, $summary['total_transactions'] ?? null);
        $this->assertEquals(0.00, $totalCollection);
        $this->assertCount(0, $paymentBreakdown);

        // 2. Settle the credit bill on 2026-08-11.
        Carbon::setTestNow('2026-08-11 14:00:00');

        $creditBill = CreditBill::where('bill_id', $bill->id)->first();
        $this->assertNotNull($creditBill);

        // Record a settlement of 5000 LKR under cash method
        $settleResponse = $this->actingAs($this->user)
            ->post(route('studio.credit-management.payment', $creditBill->id), [
                'amount' => 5000,
                'payment_method' => 'cash',
                'reference_number' => 'REF-SETTLE-001',
                'front_officer_id' => $this->employee->id,
            ]);

        $settleResponse->assertRedirect();
        $settleResponse->assertSessionHasNoErrors();

        // 3. Inspect report for 2026-08-10 (creation day) again. Gross revenue reflects the bill created on that day, but Total Collection is 0.00.
        $oldReportResponse = $this->actingAs($this->user)
            ->get(route('reports.daily', ['start_date' => '2026-08-10', 'end_date' => '2026-08-10']));
        
        $oldReportResponse->assertStatus(200);
        $oldTotalCollection = $oldReportResponse->original->getData()['page']['props']['totalCollection'] ?? null;
        $this->assertEquals(0.00, $oldTotalCollection);

        // 4. Inspect report for 2026-08-11 (settlement day). It should show 5000 Total Collection under cash.
        $newReportResponse = $this->actingAs($this->user)
            ->get(route('reports.daily', ['start_date' => '2026-08-11', 'end_date' => '2026-08-11']));

        $newReportResponse->assertStatus(200);
        $newSummary = $newReportResponse->original->getData()['page']['props']['summary'] ?? null;
        $newPaymentBreakdown = $newReportResponse->original->getData()['page']['props']['paymentBreakdown'] ?? [];
        $newTotalCollection = $newReportResponse->original->getData()['page']['props']['totalCollection'] ?? null;

        // Daily gross revenue for bills created today is 0.00
        $this->assertEquals(0.00, $newSummary['gross_revenue'] ?? null);
        // Total Collection today is 5000.00
        $this->assertEquals(5000.00, $newTotalCollection);

        // Payment breakdown should have 1 item: Cash payment of 5000.00
        $this->assertCount(1, $newPaymentBreakdown);
        $this->assertEquals('cash', $newPaymentBreakdown[0]->method ?? null);
        $this->assertEquals(5000.00, $newPaymentBreakdown[0]->total ?? null);
        $this->assertEquals(1, $newPaymentBreakdown[0]->count ?? null);

        Carbon::setTestNow(); // Reset time tracking
    }

    public function test_pos_checkout_cash_payment_registers_immediately(): void
    {
        Carbon::setTestNow('2026-08-12 12:00:00');

        // Verify standard POS checkout with Cash
        // This hits route('studio.pos.commit') to store a delivered bill directly
        $payload = [
            'payment_method' => 'cash',
            'paid_amount' => 1500,
            'discount_amount' => 0,
            'items' => [
                [
                    'is_stock_item' => false,
                    'description' => 'Photo Frame S1',
                    'quantity' => 1,
                    'unit_price' => 1500,
                ]
            ],
            'front_officer_id' => $this->employee->id,
        ];

        $response = $this->actingAs($this->user)
            ->post(route('studio.pos.commit'), $payload, ['X-POS-Commit' => '1']);

        $response->assertStatus(200);

        // Verify database and Daily Sales Report reflect the payment amount immediately
        $reportResponse = $this->actingAs($this->user)
            ->get(route('reports.daily', ['start_date' => '2026-08-12', 'end_date' => '2026-08-12']));

        $reportResponse->assertStatus(200);
        $summary = $reportResponse->original->getData()['page']['props']['summary'] ?? null;
        $paymentBreakdown = $reportResponse->original->getData()['page']['props']['paymentBreakdown'] ?? [];

        // Daily gross revenue should be 1500.00
        $this->assertEquals(1500.00, $summary['gross_revenue'] ?? null);
        // Total transactions count today should be 1
        $this->assertEquals(1, $summary['total_transactions'] ?? null);

        // Payment breakdown should have 1 item: Cash payment of 1500.00
        $this->assertCount(1, $paymentBreakdown);
        $this->assertEquals('cash', $paymentBreakdown[0]->method ?? null);
        $this->assertEquals(1500.00, $paymentBreakdown[0]->total ?? null);
        $this->assertEquals(1, $paymentBreakdown[0]->count ?? null);

        // Verify totalCollection prop is present and correct
        $totalCollection = $reportResponse->original->getData()['page']['props']['totalCollection'] ?? null;
        $this->assertEquals(1500.00, $totalCollection);

        Carbon::setTestNow(); // Reset time tracking
    }

    public function test_daily_sales_report_total_collection_includes_credit_settlements_and_advance_payments(): void
    {
        Carbon::setTestNow('2026-08-15 10:00:00');

        // Create a credit bill in past month
        $creditBill = CreditBill::create([
            'shop_id' => $this->shop->id,
            'type' => 'credit',
            'customer_name' => 'John Doe',
            'total_amount' => 3000,
            'paid_amount' => 0,
            'balance_amount' => 3000,
            'created_by' => $this->employee->id,
            'promise_date' => today()->addDays(7),
            'status' => 'outstanding',
        ]);

        // Move to today and settle the credit bill
        Carbon::setTestNow('2026-08-20 15:00:00');

        $this->actingAs($this->user)
            ->post(route('studio.credit-management.payment', $creditBill->id), [
                'amount' => 3000,
                'payment_method' => 'bank_transfer',
                'reference_number' => 'BT-12345',
                'front_officer_id' => $this->employee->id,
            ]);

        $reportResponse = $this->actingAs($this->user)
            ->get(route('reports.daily', ['start_date' => '2026-08-20', 'end_date' => '2026-08-20']));

        $reportResponse->assertStatus(200);

        $props = $reportResponse->original->getData()['page']['props'];
        $this->assertEquals(3000.00, $props['totalCollection'] ?? null);
        $this->assertEquals(3000.00, $props['summary']['total_collection'] ?? null);

        Carbon::setTestNow();
    }
}
