<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\BillCategory;
use App\Models\Employee;
use App\Models\User;
use App\Models\DealerCommission;
use App\Modules\Shops\Models\Shop;
use App\Services\BillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DealerCommissionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Shop $shop;
    private Employee $cashier;
    private Employee $dealer;
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

        $superAdminRoleId = \App\Models\Role::query()->where('slug', 'super_admin')->value('id') ?? \App\Models\Role::create([
            'slug' => 'super_admin',
            'name' => 'Super Admin',
            'permissions' => [],
        ])->id;

        $this->user = User::factory()->create([
            'last_shop_id' => $this->shop->id,
            'role_id' => $superAdminRoleId,
        ]);

        $this->cashier = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => 'Test Cashier',
            'email' => 'cashier@applantics.com',
            'role' => 'cashier',
            'status' => 'active',
        ]);

        $this->dealer = Employee::create([
            'shop_id' => $this->shop->id,
            'name' => 'Test Dealer',
            'email' => 'dealer@applantics.com',
            'role' => 'dealer',
            'status' => 'active',
            'default_commission_pct' => 12.5,
        ]);

        $this->billService = app(BillService::class);
    }

    public function test_create_bill_calculates_and_stores_dealer_commission(): void
    {
        $category = BillCategory::create([
            'shop_id' => $this->shop->id,
            'name' => 'Manual Job Type 1',
        ]);

        $bill = $this->billService->createBill([
            'created_by' => $this->cashier->id,
            'status' => 'delivered',
            'dealer_id' => $this->dealer->id,
            'dealer_commission_pct' => 12.5,
            'is_dealer_commission_applicable' => true,
            'creation_charge' => 500.00,
            'items' => [
                [
                    'category_id' => $category->id,
                    'is_stock_item' => false,
                    'description' => 'Custom Frame printing',
                    'quantity' => 2,
                    'unit_price' => 400,
                ]
            ],
            'paid_amount' => 800,
            'payment_method' => 'cash',
        ]);

        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'dealer_id' => $this->dealer->id,
            'dealer_commission_pct' => 12.5,
            'is_dealer_commission_applicable' => true,
            'subtotal' => 800.00,
            'creation_charge' => 500.00,
            'after_discount' => 800.00, // subtotal (800.00)
        ]);

        $this->assertDatabaseHas('dealer_commissions', [
            'bill_id' => $bill->id,
            'dealer_id' => $this->dealer->id,
            'commission_pct' => 12.50,
            'commissionable_amount' => 500.00,
            'commission_amt' => 62.50,
            'is_paid' => false,
        ]);
    }

    public function test_http_store_pos_commit_saves_dealer_commission_successfully(): void
    {
        $category = BillCategory::create([
            'shop_id' => $this->shop->id,
            'name' => 'Manual Job Column',
        ]);

        $payload = [
            'items' => [
                [
                    'category_id' => $category->id,
                    'is_stock_item' => false,
                    'description' => 'Special Print Layout',
                    'quantity' => 1,
                    'unit_price' => 1000,
                ]
            ],
            'dealer_id' => $this->dealer->id,
            'dealer_commission_pct' => 8.0,
            'is_dealer_commission_applicable' => true,
            'creation_charge' => 600.00,
            'creation_charge_items' => [
                [
                    'label' => 'Creation charge',
                    'amount' => 600.00,
                    'editor_id' => null,
                ]
            ],
            'dealer_commission_items' => [
                [
                    'label' => 'Referral commission',
                    'amount' => 150.00,
                    'dealer_id' => $this->dealer->id,
                ]
            ],
            'discount_amount' => 0,
            'paid_amount' => 1000,
            'payment_method' => 'cash',
        ];

        $response = $this->actingAs($this->user)
            ->post(route('studio.pos.commit'), $payload, [
                'X-POS-Commit' => '1',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('bills', [
            'dealer_id' => $this->dealer->id,
            'dealer_commission_pct' => 8.00,
            'is_dealer_commission_applicable' => true,
            'subtotal' => 1000.00,
            'creation_charge' => 600.00,
            'after_discount' => 1000.00,
        ]);

        $this->assertDatabaseHas('dealer_commissions', [
            'dealer_id' => $this->dealer->id,
            'commission_pct' => 100.00,
            'commissionable_amount' => 150.00,
            'commission_amt' => 150.00,
            'is_paid' => true,
        ]);
    }
}
