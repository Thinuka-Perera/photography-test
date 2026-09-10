<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\EditorCommission;
use App\Models\Employee;
use App\Models\SalaryProfile;
use App\Models\Expense;
use App\Modules\Shops\Models\Shop;
use App\Services\PayrollService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function index(Request $request, PayrollService $payrollService): Response
    {
        $month = $request->string('month')->toString();
        $month = $month !== '' ? $month : now()->format('Y-m');
        $monthStart = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();

        $activeShop = app(Shop::class);
        $user = auth()->user();
        
        $employeeQuery = Employee::query()->forShop($activeShop->id);
        
        if (! $user->hasAnyRole(['super_admin', 'admin'])) {
            $matchedEmployeeId = Employee::resolveForUser($user, $activeShop->id);
            if ($matchedEmployeeId) {
                $employeeQuery->where('id', $matchedEmployeeId);
            } else {
                $employeeQuery->whereRaw('1 = 0');
            }
        }
        
        $employees = $employeeQuery->orderBy('name')->get();
        
        $profiles = SalaryProfile::query()
            ->with('ledgerEntries')
            ->whereIn('employee_id', $employees->pluck('id'))
            ->whereDate('month', $monthStart->toDateString())
            ->get()
            ->keyBy('employee_id');

        $historyProfiles = SalaryProfile::query()
            ->with('ledgerEntries')
            ->whereIn('employee_id', $employees->pluck('id'))
            ->orderByDesc('month')
            ->get()
            ->groupBy('employee_id');

        $attendanceByEmployee = Attendance::query()
            ->whereHas('employee', fn ($q) => $q->forShop($activeShop->id))
            ->whereBetween('work_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get()
            ->groupBy('employee_id');

        $rows = $employees->map(function (Employee $employee) use (
            $profiles,
            $historyProfiles,
            $attendanceByEmployee,
            $payrollService,
            $monthStart

        ) {
            $profile = $profiles->get($employee->id);
            $attendance = $attendanceByEmployee->get($employee->id, collect())->values();
            $ledgerEntries = $profile?->ledgerEntries ?? collect();
            $history = $historyProfiles->get($employee->id, collect())->values();
            $summary = $payrollService->calculateMonthlySummary(
                $employee,
                $profile,
                $attendance,
                $ledgerEntries,
            );

            // Add commission data for editors and dealers
            $commissionPaid = 0;
            $commissionPending = 0;
            $roleLower = strtolower($employee->role ?? '');
            $jobRoleLower = strtolower($employee->job_role ?? '');
            $isDealer = str_contains($roleLower, 'dealer') || str_contains($jobRoleLower, 'dealer');

            if ($employee->role === 'editor') {
                $commissionPaid = (float) EditorCommission::query()
                    ->where('editor_id', $employee->id)
                    ->where('is_paid', true)
                    ->whereMonth('commission_date', $monthStart->month)
                    ->whereYear('commission_date', $monthStart->year)
                    ->sum('commission_amt');

                $commissionPending = (float) EditorCommission::query()
                    ->where('editor_id', $employee->id)
                    ->where('is_paid', false)
                    ->whereMonth('commission_date', $monthStart->month)
                    ->whereYear('commission_date', $monthStart->year)
                    ->sum('commission_amt');
            } elseif ($isDealer) {
                $commissionPaid = (float) \App\Models\DealerCommission::query()
                    ->where('dealer_id', $employee->id)
                    ->where('is_paid', true)
                    ->whereMonth('commission_date', $monthStart->month)
                    ->whereYear('commission_date', $monthStart->year)
                    ->sum('commission_amt');

                $commissionPending = (float) \App\Models\DealerCommission::query()
                    ->where('dealer_id', $employee->id)
                    ->where('is_paid', false)
                    ->whereMonth('commission_date', $monthStart->month)
                    ->whereYear('commission_date', $monthStart->year)
                    ->sum('commission_amt');
            }

            return [
                'employee' => $employee,
                'profile' => $profile,
                'summary' => $summary,
                'attendance' => $attendance,
                'history' => $history,
                'commission_paid' => $commissionPaid,
                'commission_pending' => $commissionPending,
            ];
        });

        $totals = [
            'gross_salary' => round($rows->sum(fn ($row) => $row['summary']['gross_salary']), 2),
            'net_salary' => round($rows->sum(fn ($row) => $row['summary']['net_salary']), 2),
            'overtime_pay' => round($rows->sum(fn ($row) => $row['summary']['overtime_pay']), 2),
            'total_deductions' => round($rows->sum(fn ($row) => $row['summary']['total_deductions']), 2),
            'commission_paid' => round($rows->sum(fn ($row) => $row['commission_paid']), 2),
            'commission_pending' => round($rows->sum(fn ($row) => $row['commission_pending']), 2),
        ];

        return Inertia::render('Payroll/Salaries', [
            'month' => $month,
            'rows' => $rows,
            'totals' => $totals,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);

        $monthDate = Carbon::createFromFormat('Y-m', $data['month'])->startOfMonth()->toDateString();

        $employee = Employee::findOrFail($data['employee_id']);
        $roleLower = strtolower($employee->role ?? '');
        $jobRoleLower = strtolower($employee->job_role ?? '');
        $isDealer = str_contains($roleLower, 'dealer') || str_contains($jobRoleLower, 'dealer');
        if ($isDealer) {
            $data['basic_salary'] = 0;
            $data['attendance_allowance'] = 0;
            $data['overtime_rate'] = 0;
        }

        $exists = SalaryProfile::query()
            ->where('employee_id', $data['employee_id'])
            ->whereDate('month', $monthDate)
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'month' => 'A salary profile already exists for this employee and month.',
            ]);
        }

        SalaryProfile::create([
            ...$data,
            'month' => $monthDate,
        ]);

        Employee::where('id', $data['employee_id'])->update([
            'basic_salary' => $data['basic_salary'],
            'overtime_rate' => $data['overtime_rate'],
        ]);

        return back()->with('success', 'Salary profile created successfully.');
    }

    public function update(Request $request, SalaryProfile $salaryProfile): RedirectResponse
    {
        if ($salaryProfile->paid_at) {
            return back()->with('error', 'This salary profile is paid and cannot be edited.');
        }

        $employee = $salaryProfile->employee;
        $roleLower = strtolower($employee->role ?? '');
        $jobRoleLower = strtolower($employee->job_role ?? '');
        $isDealer = str_contains($roleLower, 'dealer') || str_contains($jobRoleLower, 'dealer');
        if ($isDealer) {
            $data['basic_salary'] = 0;
            $data['attendance_allowance'] = 0;
            $data['overtime_rate'] = 0;
        }

        $salaryProfile->update([
            'basic_salary' => $data['basic_salary'],
            'attendance_allowance' => $data['attendance_allowance'],
            'overtime_rate' => $data['overtime_rate'],
            'notes' => $data['notes'] ?? null,
        ]);

        $salaryProfile->employee()->update([
            'basic_salary' => $data['basic_salary'],
            'overtime_rate' => $data['overtime_rate'],
        ]);

        return back()->with('success', 'Salary profile updated successfully.');
    }

    public function destroy(SalaryProfile $salaryProfile): RedirectResponse
    {
        if ($salaryProfile->paid_at) {
            return back()->with('error', 'This salary profile is paid and cannot be deleted.');
        }

        $salaryProfile->delete();

        return back()->with('success', 'Salary profile deleted successfully.');
    }

    public function pay(SalaryProfile $salaryProfile, PayrollService $payrollService): RedirectResponse
    {
        if ($salaryProfile->paid_at) {
            return back()->with('error', 'This salary profile is already marked as paid.');
        }

        $salaryProfile->loadMissing(['employee', 'ledgerEntries']);
        $employee = $salaryProfile->employee;

        // Parse month to get month start and end dates
        $monthStart = Carbon::parse($salaryProfile->month)->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();

        // Retrieve attendance records for the month
        $attendance = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereBetween('work_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get();

        // Calculate monthly summary
        $summary = $payrollService->calculateMonthlySummary(
            $employee,
            $salaryProfile,
            $attendance,
            $salaryProfile->ledgerEntries,
        );

        $netSalary = $summary['net_salary'];

        DB::transaction(function () use ($salaryProfile, $employee, $netSalary) {
            $salaryProfile->update([
                'paid_at' => now(),
            ]);

            Expense::create([
                'shop_id' => $employee->shop_id,
                'category' => 'Salaries',
                'description' => "Salary payment for {$employee->name} (" . Carbon::parse($salaryProfile->month)->format('Y-m') . ")",
                'amount' => $netSalary,
                'expense_date' => now()->toDateString(),
                'created_by' => auth()->id(),
            ]);
        });

        return back()->with('success', 'Salary marked as paid and logged as an expense.');
    }

    private function validatePayload(Request $request, bool $requireMonth = true): array
    {
        $rules = [
            'employee_id' => ['required', 'exists:employees,id'],
            'basic_salary' => ['required', 'numeric', 'min:0'],
            'attendance_allowance' => ['required', 'numeric', 'min:0'],
            'overtime_rate' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];

        if ($requireMonth) {
            $rules['month'] = ['required', 'date_format:Y-m'];
        }

        return $request->validate($rules);
    }
}
