<?php

namespace App\Http\Controllers\Studio;

use App\Http\Controllers\Controller;
use App\Models\CreditBill;
use App\Models\Employee;
use App\Modules\Shops\Models\Shop;
use App\Services\CreditBillService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CreditBillController extends Controller
{
    public function __construct(private CreditBillService $creditBillService) {}

    public function index(Request $request): Response
    {
        $activeType = $request->query('type', 'credit');
        if (! in_array($activeType, ['credit', 'advance'], true)) {
            $activeType = 'credit';
        }

        $activeShop = app(Shop::class);
        $bills = CreditBill::forShop($activeShop->id)
            ->with([
                'bill:id,bill_number',
                'sale:id,sale_number,total_amount',
                'createdByEmployee:id,name',
                'settledByEmployee:id,name',
                'payments.createdByEmployee:id,name',
            ])
            ->where('type', $activeType)
            ->latest('created_at')
            ->get();

        $overdueCount = $bills->filter(fn (CreditBill $bill) => $bill->isOverdue())->count();

        $bills = $bills->map(function (CreditBill $bill) {
            return [
                'id' => $bill->id,
                'bill_number' => $bill->bill?->bill_number ?? $bill->sale?->sale_number,
                'sale_id' => $bill->sale_id,
                'sale_number' => $bill->sale?->sale_number,
                'type' => $bill->type,
                'customer_name' => $bill->customer_name,
                'customer_phone' => $bill->customer_phone,
                'total_amount' => (float) $bill->total_amount,
                'paid_amount' => (float) $bill->paid_amount,
                'balance_amount' => (float) $bill->balance_amount,
                'promise_date' => optional($bill->promise_date)?->toDateString(),
                'status' => $bill->status,
                'is_overdue' => $bill->isOverdue(),
                'settled_date' => optional($bill->settled_date)?->toDateString(),
                'created_by_employee' => $bill->createdByEmployee?->only(['id', 'name']),
                'settled_by_employee' => $bill->settledByEmployee?->only(['id', 'name']),
                'payments' => $bill->payments->map(fn ($payment) => [
                    'id' => $payment->id,
                    'amount' => (float) $payment->amount,
                    'payment_method' => $payment->payment_method,
                    'reference_number' => $payment->reference_number,
                    'bank_name' => $payment->bank_name,
                    'created_at' => optional($payment->created_at)?->toIso8601String(),
                    'created_by_employee' => $payment->createdByEmployee?->only(['id', 'name']),
                ])->values(),
            ];
        })->values();

        $frontOfficers = Employee::query()
            ->forShop($activeShop->id)
            ->where(function ($query) {
                $query->where('job_role', 'front_office')
                    ->orWhere('job_role', 'front_officer')
                    ->orWhere('role', 'front_officer');
            })
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Studio/CreditManagement/Index', [
            'bills' => $bills,
            'overdueCount' => $overdueCount,
            'frontOfficers' => $frontOfficers,
            'activeType' => $activeType,
        ]);
    }

    public function recordPayment(Request $request, CreditBill $creditBill): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:'.(float) $creditBill->balance_amount],
            'payment_method' => ['required', 'in:cash,card,bank_transfer'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'bank_name' => ['nullable', 'string', 'max:100'],
            'front_officer_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $this->creditBillService->recordPayment($creditBill, $validated);

        return back()->with('success', 'Payment recorded successfully.');
    }

    /**
     * Search for advance bills by last 4 digits of bill ID or bill number
     */
    public function searchAdvanceBill(Request $request)
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $searchTerm = $request->query('q', '');

        if (strlen($searchTerm) < 2) {
            return response()->json(['bills' => []]);
        }

        $bills = CreditBill::forShop($activeShop->id)
            ->where('type', 'advance')
            ->where('status', 'outstanding')
            ->where(function ($query) use ($searchTerm) {
                // Search by last 4 digits of bill_id or bill_number from related Bill
                $query->whereRaw("CAST(bill_id AS CHAR) LIKE ?", ["%{$searchTerm}%"])
                    ->orWhereHas('bill', function ($q) use ($searchTerm) {
                        $q->where('bill_number', 'LIKE', "%{$searchTerm}%");
                    });
            })
            ->with(['createdByEmployee:id,name', 'bill:id,bill_number'])
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(function (CreditBill $bill) {
                return [
                    'id' => $bill->id,
                    'bill_id' => $bill->bill_id,
                    'bill_number' => $bill->bill?->bill_number ?? 'N/A',
                    'customer_name' => $bill->customer_name,
                    'customer_phone' => $bill->customer_phone,
                    'total_amount' => (float) $bill->total_amount,
                    'paid_amount' => (float) $bill->paid_amount,
                    'balance_amount' => (float) $bill->balance_amount,
                    'front_officer_name' => $bill->createdByEmployee?->name,
                ];
            });

        return response()->json(['bills' => $bills]);
    }
}
