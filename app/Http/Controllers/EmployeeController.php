<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Modules\Shops\Models\Shop;
use App\Services\EmployeeBirthdayService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function __construct(protected EmployeeBirthdayService $birthdayService) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);

        $employees = Employee::query()
            ->forShop($activeShop->id)
            ->search($search)
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        $stats = [
            'total' => Employee::forShop($activeShop->id)->count(),
            'active' => Employee::forShop($activeShop->id)->where('status', 'active')->count(),
            'inactive' => Employee::forShop($activeShop->id)->where('status', 'inactive')->count(),
        ];

        $calendarYear = (int) $request->input('calendar_year', now()->year);
        $calendarMonth = max(1, min(12, (int) $request->input('calendar_month', now()->month)));

        return Inertia::render('Employees/Index', [
            'employees' => $employees,
            'stats' => $stats,
            'filters' => [
                'search' => $search,
                'show_calendar' => $request->boolean('show_calendar'),
                'calendar_year' => $calendarYear,
                'calendar_month' => $calendarMonth,
            ],
            'birthdayReminders' => $this->birthdayService
                ->remindersForShop($activeShop->id)
                ->values()
                ->all(),
            'birthdayCalendar' => $this->birthdayService->calendarForShop(
                $activeShop->id,
                $calendarYear,
                $calendarMonth,
            ),
            'systemRoles' => \App\Models\Role::select('name', 'slug')
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    public function birthdays(Request $request): RedirectResponse
    {
        return redirect()->route('employees.index', [
            'show_calendar' => 1,
            'calendar_year' => (int) $request->input('year', now()->year),
            'calendar_month' => max(1, min(12, (int) $request->input('month', now()->month))),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);
        Employee::create(array_merge($this->validatePayload($request), [
            'shop_id' => $activeShop->id,
        ]));

        return back()->with('success', 'Employee created successfully.');
    }

    public function update(Request $request, Employee $employee): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);
        $this->assertEmployeeBelongsToShop($employee, $activeShop->id);

        return $this->persistUpdate($request, $employee);
    }

    public function updatePost(Request $request): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);

        $employee = $this->resolvePostedEmployee($request, $activeShop->id);

        return $this->persistUpdate($request, $employee);
    }

    private function persistUpdate(Request $request, Employee $employee): RedirectResponse
    {

        $employee->update($this->validatePayload($request));

        return back()->with('success', 'Employee updated successfully.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);
        $this->assertEmployeeBelongsToShop($employee, $activeShop->id);

        return $this->performDelete($employee);
    }

    public function destroyPost(Request $request): RedirectResponse
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);

        $employee = $this->resolvePostedEmployee($request, $activeShop->id);

        return $this->performDelete($employee);
    }

    private function performDelete(Employee $employee): RedirectResponse
    {

        $employee->loadCount(['attendances', 'salaryProfiles']);

        if ($employee->attendances_count > 0 || $employee->salary_profiles_count > 0) {
            return back()->with(
                'error',
                'This employee cannot be deleted because attendance or salary records already exist.'
            );
        }

        $employee->delete();

        return back()->with('success', 'Employee deleted successfully.');
    }

    private function resolvePostedEmployee(Request $request, int $shopId): Employee
    {
        $employeeId = (int) $request->validate([
            'employee_id' => 'required|integer',
        ])['employee_id'];

        $employee = Employee::query()
            ->forShop($shopId)
            ->find($employeeId);

        abort_if($employee === null, 404);

        return $employee;
    }

    private function assertEmployeeBelongsToShop(Employee $employee, int $shopId): void
    {
        abort_unless((int) $employee->shop_id === $shopId, 404);
    }

    private function resolveActiveShop(): ?Shop
    {
        if (app()->bound(Shop::class)) {
            $bound = app(Shop::class);
            if ($bound instanceof Shop && $bound->exists) {
                return $bound;
            }
        }

        return Shop::query()
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();
    }

    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['nullable', Rule::exists('roles', 'slug')],
            'default_commission_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'address' => ['nullable', 'string', 'max:500'],
            'parent_phone' => ['nullable', 'string', 'max:30'],
            'real_location' => ['nullable', 'string', 'max:500'],
            'epf_number' => ['nullable', 'string', 'max:50'],
            'birthday' => ['nullable', 'date'],
            'basic_salary' => ['nullable', 'numeric', 'min:0'],
            'overtime_rate' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Fix commission for non-editors and non-dealers
        $roleSlug = $validated['role'] ?? '';
        $isCommissionable = $roleSlug === 'editor' || str_contains($roleSlug, 'dealer');
        
        if (!$isCommissionable) {
            $validated['default_commission_pct'] = 0;
        }

        // If empty → assign defaults (5% for editors, 0 for others)
        if (empty($validated['default_commission_pct'])) {
            if ($roleSlug === 'editor') {
                $validated['default_commission_pct'] = 5;
            } else {
                $validated['default_commission_pct'] = 0;
            }
        }

        // Sync job_role to role if it is a valid legacy enum value, otherwise fallback to default
        $legacyEnumValues = ['front_office', 'editor', 'trainee'];
        if (in_array($roleSlug, $legacyEnumValues, true)) {
            $validated['job_role'] = $roleSlug;
        } else {
            $validated['job_role'] = 'front_office';
        }

        if (!isset($validated['birthday']) || $validated['birthday'] === '') {
            $validated['birthday'] = null;
        }

        if (!isset($validated['basic_salary']) || $validated['basic_salary'] === '') {
            $validated['basic_salary'] = 0;
        }

        if (!isset($validated['overtime_rate']) || $validated['overtime_rate'] === '') {
            $validated['overtime_rate'] = 0;
        }

        return $validated;
    }
}
