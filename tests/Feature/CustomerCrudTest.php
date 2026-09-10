<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_view_the_customers_page(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('customers.index'));

        $response->assertOk();
        $response->assertSee('Customers');
    }

    public function test_customers_can_be_created_updated_and_deleted(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('customers.store'), [
            'name' => 'Nadeesha Perera',
            'phone' => '0771234567',
            'email' => 'nadeesha@example.com',
            'address' => 'Kandy',
            'notes' => 'Prefers WhatsApp updates.',
        ])->assertRedirect();

        $customer = Customer::firstOrFail();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'name' => 'Nadeesha Perera',
            'phone' => '0771234567',
        ]);

        $this->actingAs($user)->put(route('customers.update', $customer), [
            'name' => 'Nadeesha P.',
            'phone' => '0719998888',
            'email' => 'nadeesha.updated@example.com',
            'address' => 'Colombo',
            'notes' => 'Updated profile.',
        ])->assertRedirect();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'name' => 'Nadeesha P.',
            'phone' => '0719998888',
            'email' => 'nadeesha.updated@example.com',
        ]);

        $this->actingAs($user)->delete(route('customers.destroy', $customer))
            ->assertRedirect();

        $this->assertDatabaseMissing('customers', [
            'id' => $customer->id,
        ]);
    }

    public function test_customers_with_linked_invoices_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $customer = Customer::create([
            'name' => 'Protected Customer',
            'phone' => '0700000000',
        ]);

        Invoice::create([
            'invoice_number' => 'INV-GN-0001',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'module' => 'general',
            'subtotal' => 1000,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'tax_rate' => 0,
            'total_amount' => 1000,
            'status' => 'draft',
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)->delete(route('customers.destroy', $customer))
            ->assertRedirect();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
        ]);
    }
}
