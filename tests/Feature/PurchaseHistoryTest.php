<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_stock_ins_are_listed_in_the_purchase_history_ledger(): void
    {
        $user = User::factory()->admin()->create();
        $variant = $this->createVariant();

        $this->actingAs($user)->post(route('inventory.stockIn'), [
            'variant_id' => $variant->id,
            'quantity' => 5,
            'reason' => 'Purchase',
            'date' => '2026-04-22',
            'purchase_cost' => '100.00',
            'shipping_cost' => '25.00',
            'other_cost' => '10.00',
            'notes' => 'Morning restock',
        ])->assertRedirect();

        $response = $this->actingAs($user)->get(route('inventory.purchases'));

        $response->assertOk();
        $response->assertSee('Purchase History');
        $response->assertSee('Test Frame');
        $response->assertSee('Morning restock');

        $this->assertDatabaseHas('stock_logs', [
            'variant_id' => $variant->id,
            'type' => 'IN',
            'reason' => 'Purchase',
            'quantity' => 5,
        ]);
    }

    public function test_non_purchase_stock_ins_are_not_shown_in_purchase_history(): void
    {
        $user = User::factory()->admin()->create();
        $variant = $this->createVariant('Adjustment Frame');

        $this->actingAs($user)->post(route('inventory.stockIn'), [
            'variant_id' => $variant->id,
            'quantity' => 3,
            'reason' => 'Opening Balance',
            'date' => '2026-04-22',
        ])->assertRedirect();

        $response = $this->actingAs($user)->get(route('inventory.purchases'));

        $response->assertOk();
        $response->assertDontSee('Adjustment Frame');
        $response->assertSee('No purchase entries matched the current filters.');
    }

    protected function createVariant(string $name = 'Test Frame'): ProductVariant
    {
        $category = Category::create([
            'name' => "{$name} Category",
            'type' => 'general',
        ]);

        $product = Product::create([
            'name' => $name,
            'category_id' => $category->id,
            'uom' => 'unit',
        ]);

        return ProductVariant::create([
            'product_id' => $product->id,
            'size' => '4x6',
            'grade_type' => 'A',
            'cost_price' => 90,
            'selling_price' => 140,
        ]);
    }
}
