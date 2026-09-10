<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\Customer;
use App\Models\CreditBill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $activeShop = app(\App\Modules\Shops\Models\Shop::class);

        $customers = Customer::query()
            ->forShop($activeShop->id)
            ->withCount(['invoices', 'sales'])
            ->search($search)
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        $stats = [
            'total_customers' => Customer::forShop($activeShop->id)->count(),
            'with_phone' => Customer::forShop($activeShop->id)->whereNotNull('phone')->count(),
            'with_email' => Customer::forShop($activeShop->id)->whereNotNull('email')->count(),
            'linked_records' => Customer::forShop($activeShop->id)
                ->where(function ($query) {
                    $query->whereHas('invoices')
                        ->orWhereHas('sales');
                })
                ->count(),
        ];

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'stats' => $stats,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function show(Customer $customer): Response
    {
        $customer->loadCount(['invoices', 'sales']);

        $recentInvoices = $customer->invoices()
            ->latest('created_at')
            ->limit(20)
            ->get();

        $recentSales = $customer->sales()
            ->latest('created_at')
            ->limit(20)
            ->get();

        $recentBills = collect();
        if (Schema::hasTable('bills')
            && Schema::hasColumn('bills', 'customer_name')
            && Schema::hasColumn('bills', 'customer_phone')) {
            $recentBills = Bill::query()
                ->where(function ($query) use ($customer) {
                    $query->where('customer_name', $customer->name);

                    if (!empty($customer->phone)) {
                        $query->orWhere('customer_phone', $customer->phone);
                    }
                })
                ->latest('created_at')
                ->limit(20)
                ->get();
        }

        $recentCreditBills = collect();
        if (Schema::hasTable('credit_bills')) {
            $recentCreditBills = CreditBill::query()
                ->where(function ($query) use ($customer) {
                    $query->where('customer_name', $customer->name);

                    if (!empty($customer->phone)) {
                        $query->orWhere('customer_phone', $customer->phone);
                    }
                })
                ->latest('created_at')
                ->limit(20)
                ->get();
        }

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'history' => [
                'invoices' => $recentInvoices,
                'sales' => $recentSales,
                'bills' => $recentBills,
                'creditBills' => $recentCreditBills,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);
        $data['shop_id'] = app(\App\Modules\Shops\Models\Shop::class)->id;
        Customer::create($data);

        return back()->with('success', 'Customer created successfully.');
    }

    public function storeFromPos(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $data['shop_id'] = app(\App\Modules\Shops\Models\Shop::class)->id;
        $customer = Customer::query()->create($data);

        return response()->json([
            'message' => 'Customer created successfully.',
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'customer_type' => $customer->customer_type,
            ],
        ], 201);
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $customer->update($this->validatePayload($request));

        return back()->with('success', 'Customer updated successfully.');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->loadCount(['invoices', 'sales']);

        if ($customer->invoices_count > 0 || $customer->sales_count > 0) {
            return back()->with(
                'error',
                'This customer cannot be deleted because linked invoices or sales already exist.'
            );
        }

        Customer::query()->whereKey($customer->getKey())->delete();

        return back()->with('success', 'Customer deleted successfully.');
    }

    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'customer_type' => ['nullable', 'string', Rule::in(['professional', 'amateur', 'amature'])],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\-\s]{7,20}$/'],
            'email' => ['nullable', 'email:rfc', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'phone.regex' => 'Phone number format is invalid.',
        ]);

        $validated['name'] = trim((string) $validated['name']);
        $validated['phone'] = isset($validated['phone']) ? trim((string) $validated['phone']) : null;
        $validated['email'] = isset($validated['email']) ? trim((string) $validated['email']) : null;
        $validated['address'] = isset($validated['address']) ? trim((string) $validated['address']) : null;
        $validated['notes'] = isset($validated['notes']) ? trim((string) $validated['notes']) : null;

        $type = strtolower(trim((string) ($validated['customer_type'] ?? 'amateur')));
        if ($type === 'amature') {
            $type = 'amateur';
        }

        $validated['customer_type'] = $type === 'professional' ? 'professional' : 'amateur';

        if (!Schema::hasColumn('customers', 'customer_type')) {
            unset($validated['customer_type']);
        }

        return $validated;
    }
}
