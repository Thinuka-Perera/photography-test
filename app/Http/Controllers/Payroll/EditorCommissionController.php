<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Models\EditorCommission;
use App\Models\Employee;
use App\Models\SalaryLedgerEntry;
use App\Modules\Shops\Models\Shop;
use App\Services\BillService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EditorCommissionController extends Controller
{
    public function __construct(
        private BillService $billService,
    ) {}

    /**
     * List all editor commissions with filters.
     * Only admin/super_admin can access (enforced by middleware).
     */
    public function index(Request $request)
    {
        $activeShop = app(Shop::class);
        $editorId = $request->query('editor_id');
        $month = $request->query('month', now()->month);
        $year = $request->query('year', now()->year);
        $status = $request->query('status', 'all'); // all, pending, paid

        // ── Build query with filters ────────────────────────────────────
        $query = EditorCommission::forShop($activeShop->id)
            ->with(['bill', 'editor', 'salaryLedgerEntry'])
            ->whereYear('commission_date', '=', $year)
            ->whereMonth('commission_date', '=', $month);

        if ($editorId) {
            $query->where('editor_id', $editorId);
        }

        if ($status === 'pending') {
            $query->where('is_paid', false);
        } elseif ($status === 'paid') {
            $query->where('is_paid', true);
        }

        $commissions = $query->orderByDesc('commission_date')
            ->paginate(50)
            ->appends($request->query());

        $collection = $commissions->getCollection();
        $saleIds = $collection
            ->map(fn ($commission) => $commission->sale_id ?? $commission->bill?->sale_id)
            ->filter()
            ->unique()
            ->values();
        $employeeIds = $collection->pluck('editor_id')->filter()->unique()->values();

        $inPayrollLookup = [];
        if ($saleIds->isNotEmpty() && $employeeIds->isNotEmpty()) {
            $inPayrollLookup = SalaryLedgerEntry::query()
                ->join('salary_profiles', 'salary_profiles.id', '=', 'salary_ledger_entries.salary_profile_id', 'inner', false)
                ->whereIn('salary_ledger_entries.sale_id', $saleIds)
                ->whereIn('salary_profiles.employee_id', $employeeIds)
                ->get([
                    'salary_ledger_entries.sale_id',
                    'salary_profiles.employee_id',
                ])
                ->mapWithKeys(fn ($row) => ["{$row->sale_id}:{$row->employee_id}" => true])
                ->all();
        }

        // ── Calculate summary per editor (filtered month) ────────────────
        $summaryQuery = EditorCommission::forShop($activeShop->id)
            ->whereYear('commission_date', '=', $year, 'and')
            ->whereMonth('commission_date', '=', $month, 'and');

        if ($editorId) {
            $summaryQuery->where('editor_id', $editorId);
        }

        $summary = $summaryQuery
            ->selectRaw('
                editor_id,
                COUNT(DISTINCT bill_id) as jobs_count,
                SUM(total_bill_amt) as total_bill_value,
                SUM(commissionable_amount) as commissionable_total,
                SUM(creation_charge_amt) as creation_charge_total,
                SUM(commission_amt) as commission_earned,
                SUM(CASE WHEN is_paid = 1 THEN commission_amt ELSE 0 END) as commission_paid,
                SUM(CASE WHEN is_paid = 0 THEN commission_amt ELSE 0 END) as commission_pending
            ')
            ->groupBy('editor_id')
            ->with('editor')
            ->get()
            ->map(function ($row) {
                return [
                    'editor_id' => $row->editor_id,
                    'editor_name' => $row->editor?->name ?? 'Unknown',
                    'jobs_count' => (int) $row->jobs_count,
                    'total_bill_value' => (float) $row->total_bill_value,
                    'commissionable_total' => (float) $row->commissionable_total,
                    'creation_charge_total' => (float) $row->creation_charge_total,
                    'commission_earned' => (float) $row->commission_earned,
                    'commission_paid' => (float) $row->commission_paid,
                    'commission_pending' => (float) $row->commission_pending,
                ];
            });

        // ── Get all editors for dropdown ────────────────────────────────
        $editors = Employee::query()
            ->forShop($activeShop->id)
            ->editors()
            ->orderBy('name', 'asc')
            ->select('id', 'name')
            ->get();

        // ── Format commissions for table ────────────────────────────────
        $formatted = $commissions->map(function ($commission) use ($inPayrollLookup) {
            $saleId = $commission->sale_id ?? $commission->bill?->sale_id;
            $lookupKey = $saleId ? "{$saleId}:{$commission->editor_id}" : null;

            $inPayroll = $lookupKey
                ? (bool) ($inPayrollLookup[$lookupKey] ?? false)
                : ! is_null($commission->ledger_entry_id);

            return [
                'id' => $commission->id,
                'editor_id' => $commission->editor_id,
                'date' => $commission->commission_date?->format('M d, Y') ?? '-',
                'bill_no' => $commission->bill?->bill_number ?? 'N/A',
                'editor_name' => $commission->editor?->name ?? 'Unknown',
                'job_description' => $commission->job_description ?? '-',
                'bill_total' => (float) $commission->total_bill_amt,
                'commissionable_amt' => (float) $commission->commissionable_amount,
                'creation_charge_amt' => (float) ($commission->creation_charge_amt ?? 0),
                'commission_pct' => (float) $commission->commission_pct,
                'commission_amt' => (float) $commission->commission_amt,
                'is_paid' => (bool) $commission->is_paid,
                'paid_at' => $commission->paid_at?->format('M d, Y') ?? null,
                'ledger_entry_id' => $commission->ledger_entry_id,
                'can_mark_paid' => ! $commission->is_paid && is_null($commission->ledger_entry_id),
                'in_payroll' => $inPayroll,
            ];
        });

        return Inertia::render('Payroll/EditorCommissions', [
            'commissions' => [
                'data' => $formatted,
                'current_page' => $commissions->currentPage(),
                'per_page' => $commissions->perPage(),
                'total' => $commissions->total(),
                'last_page' => $commissions->lastPage(),
            ],
            'summary' => $summary,
            'filters' => [
                'editor_id' => $editorId,
                'month' => (int) $month,
                'year' => (int) $year,
                'status' => $status,
            ],
            'editors' => $editors,
            'current_month_year' => Carbon::createFromDate($year, $month, 1)->format('F Y'),
        ]);
    }

    /**
     * Mark a commission as paid and add to salary ledger.
     *
     * POST /payroll/editor-commissions/{commission}/mark-paid
     *
     * Response: 200 success + updated commission data
     *           422 validation error (already paid/added to salary)
     */
    public function markPaid(Request $request, EditorCommission $commission)
    {
        try {
            $result = $this->billService->markCommissionPaid(
                $commission,
                (int) ($request->user()?->getAuthIdentifier() ?? 0)
            );

            return back()
                ->with('success', sprintf(
                    'Commission for %s marked as paid and added to salary ledger.',
                    $commission->editor?->name ?? 'Editor'
                ));
        } catch (\InvalidArgumentException $e) {
            return redirect()->back()
                ->withErrors(['commission_error' => $e->getMessage()]);
        } catch (\Throwable $e) {
            return redirect()->back()
                ->withErrors(['commission_error' => 'Failed to mark commission as paid. Please try again.']);
        }
    }

    /**
     * Batch mark multiple commissions as paid and add to salary ledger.
     *
     * POST /payroll/editor-commissions/batch-mark-paid
     *
     * Payload: {
     *   'commission_ids': [1, 2, 3, ...],  // Array of commission IDs to mark as paid
     * }
     *
     * Response: 200 success with count of marked commissions
     *           400 validation error (no commissions, invalid IDs, etc.)
     *           422 some commissions already paid or cannot be processed
     */
    public function batchMarkPaid(Request $request)
    {
        $validated = $request->validate([
            'commission_ids' => 'required|array|min:1',
            'commission_ids.*' => 'required|integer|exists:editor_commissions,id',
        ]);

        try {
            $commissionIds = $validated['commission_ids'];
            $processedBy = (int) ($request->user()?->getAuthIdentifier() ?? 0);

            // Fetch all commissions to be processed
            $commissions = EditorCommission::where('is_paid', false)
                ->whereIn('id', $commissionIds)
                ->where(function ($q) {
                    $q->whereNull('ledger_entry_id')->orWhere('ledger_entry_id', 0);
                })
                ->get();

            if ($commissions->isEmpty()) {
                return redirect()->back()
                    ->withErrors(['commission_error' => 'No eligible commissions found to mark as paid.']);
            }

            $successCount = 0;
            $failureCount = 0;

            DB::transaction(function () use ($commissions, $processedBy, &$successCount, &$failureCount) {
                foreach ($commissions as $commission) {
                    try {
                        $this->billService->markCommissionPaid($commission, $processedBy);
                        $successCount++;
                    } catch (\Throwable $e) {
                        $failureCount++;
                    }
                }
            });

            if ($successCount > 0) {
                $message = "Successfully marked {$successCount} commission";
                $message .= $successCount !== 1 ? 's' : '';
                $message .= ' as paid and added to salary ledger.';

                if ($failureCount > 0) {
                    $message .= " ({$failureCount} commission";
                    $message .= $failureCount !== 1 ? 's' : '';
                    $message .= ' could not be processed.)';
                }

                return back()
                    ->with('success', $message)
                    ->with('batch_marked_count', $successCount);
            }

            return redirect()->back()
                ->withErrors(['commission_error' => 'Failed to mark any commissions as paid.']);
        } catch (\Throwable $e) {
            return redirect()->back()
                ->withErrors(['commission_error' => 'Batch operation failed: '.$e->getMessage()]);
        }
    }
}
