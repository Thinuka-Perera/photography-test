<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\RoleShiftSetting;
use App\Modules\Shops\Models\Shop;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);
        $month = $request->string('month')->toString();
        $month = $month !== '' ? $month : now()->format('Y-m');
        $employeeId = $request->integer('employee_id');
        $recordFilter = $request->string('record_filter')->toString();
        $recordFilter = in_array($recordFilter, ['all', 'present', 'leave', 'late'], true)
            ? $recordFilter
            : 'all';

        $monthStart = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();

        $attendanceQuery = Attendance::query()
            ->with('employee')
            ->whereHas('employee', fn ($q) => $q->forShop($activeShop->id))
            ->whereBetween('work_date', [$monthStart->toDateString(), $monthEnd->toDateString()]);

        if ($employeeId) {
            $attendanceQuery->where('employee_id', $employeeId);
        }

        $allAttendances = (clone $attendanceQuery)->get();
        $totalMinutes = $allAttendances->sum(fn (Attendance $attendance) => $attendance->worked_minutes);
        $leaveDays = $allAttendances->where('status', 'leave')->count();
        $presentDays = $allAttendances->where('status', 'present')->count();
        $lateDays = $allAttendances->filter(fn (Attendance $attendance) => $attendance->resolvesAsLate())->count();
        $totalLateMinutes = $allAttendances->sum(function (Attendance $attendance) {
            if (! $attendance->resolvesAsLate()) {
                return 0;
            }

            return $attendance->late_minutes;
        });

        $allowedLeaves = (int) config('attendance.allowed_leaves_per_month', 4);
        $leaveRecords = $allAttendances
            ->where('status', 'leave')
            ->sortBy('work_date')
            ->values()
            ->map(fn (Attendance $attendance) => [
                'id' => $attendance->id,
                'work_date' => $attendance->work_date?->format('Y-m-d'),
                'employee_id' => $attendance->employee_id,
                'employee_name' => $attendance->employee?->name,
                'notes' => $attendance->notes,
                'created_at' => $attendance->created_at?->toIso8601String(),
                'updated_at' => $attendance->updated_at?->toIso8601String(),
            ]);

        $listQuery = clone $attendanceQuery;

        if ($recordFilter === 'present') {
            $listQuery->where('status', 'present');
        } elseif ($recordFilter === 'leave') {
            $listQuery->where('status', 'leave');
        } elseif ($recordFilter === 'late') {
            $listQuery->where('status', 'present')->where('is_late', true);
        }

        $attendances = $listQuery
            ->orderByDesc('work_date')
            ->orderByDesc('id')
            ->paginate(31)
            ->withQueryString();

        $stats = [
            'total_records' => $allAttendances->count(),
            'present_days' => $presentDays,
            'leave_days' => $leaveDays,
            'late_days' => $lateDays,
            'total_late_minutes' => $totalLateMinutes,
            'total_minutes' => $totalMinutes,
            'total_hours' => round($totalMinutes / 60, 2),
            'allowed_leaves' => $allowedLeaves,
            'remaining_leaves' => max(0, $allowedLeaves - $leaveDays),
            'exceeded_leaves' => max(0, $leaveDays - $allowedLeaves),
        ];

        return Inertia::render('Attendance/Index', [
            'attendances' => $attendances,
            'employees' => Employee::query()
                ->forShop($activeShop->id)
                ->orderBy('name')
                ->get(['id', 'name', 'role']),
            'stats' => $stats,
            'leave_records' => $leaveRecords,
            'role_shift_settings' => RoleShiftSetting::listForShop($activeShop->id),
            'late_after' => Attendance::lateAfterTime(),
            'filters' => [
                'month' => $month,
                'employee_id' => $employeeId,
                'record_filter' => $recordFilter,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);

        Attendance::create($data);

        return back()->with('success', 'Attendance recorded successfully.');
    }

    public function update(Request $request, Attendance $attendance): RedirectResponse
    {
        $this->assertAttendanceBelongsToActiveShop($attendance);

        return $this->persistUpdate($request, $attendance);
    }

    public function updatePost(Request $request): RedirectResponse
    {
        $attendance = $this->resolvePostedAttendance($request);

        return $this->persistUpdate($request, $attendance);
    }

    private function persistUpdate(Request $request, Attendance $attendance): RedirectResponse
    {

        $data = $this->validatePayload($request, $attendance->id);

        $attendance->update($data);

        return back()->with('success', 'Attendance updated successfully.');
    }

    public function destroy(Attendance $attendance): RedirectResponse
    {
        $this->assertAttendanceBelongsToActiveShop($attendance);

        return $this->performDelete($attendance);
    }

    public function destroyPost(Request $request): RedirectResponse
    {
        $attendance = $this->resolvePostedAttendance($request);

        return $this->performDelete($attendance);
    }

    private function performDelete(Attendance $attendance): RedirectResponse
    {

        $attendance->delete();

        return back()->with('success', 'Attendance deleted successfully.');
    }

    private function assertAttendanceBelongsToActiveShop(Attendance $attendance): void
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);

        $attendance->loadMissing('employee');
        abort_unless(
            $attendance->employee && (int) $attendance->employee->shop_id === (int) $activeShop->id,
            404,
        );
    }

    private function resolvePostedAttendance(Request $request): Attendance
    {
        $attendanceId = (int) $request->validate([
            'attendance_id' => 'required|integer',
        ])['attendance_id'];

        $attendance = Attendance::query()->find($attendanceId);
        abort_if($attendance === null, 404);

        $this->assertAttendanceBelongsToActiveShop($attendance);

        return $attendance;
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

    private function validatePayload(Request $request, ?int $ignoreId = null): array
    {
        $activeShop = $this->resolveActiveShop();
        abort_unless($activeShop, 404);
        $shopId = $activeShop->id;

        $data = $request->validate([
            'employee_id' => [
                'required',
                Rule::exists('employees', 'id')->where(fn ($q) => $q->where('shop_id', $shopId)),
            ],
            'work_date' => [
                'required',
                'date',
                Rule::unique('attendances', 'work_date')
                    ->where('employee_id', $request->input('employee_id'))
                    ->ignore($ignoreId),
            ],
            'status' => ['required', Rule::in(['present', 'leave'])],
            'is_late' => ['nullable', 'boolean'],
            'check_in_time' => ['nullable', 'date_format:H:i'],
            'check_out_time' => ['nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($data['status'] === 'present') {
            if (! $data['check_in_time'] || ! $data['check_out_time']) {
                $request->validate([
                    'check_in_time' => ['required', 'date_format:H:i'],
                    'check_out_time' => ['required', 'date_format:H:i'],
                ]);
            }

            $employee = Employee::query()->find($data['employee_id']);
            $shiftStart = RoleShiftSetting::startTimeFor(
                $employee?->shop_id ?? $activeShop?->id,
                $employee?->role ?? $employee?->job_role,
            );

            $data['is_late'] = $request->has('is_late')
                ? $request->boolean('is_late')
                : Attendance::checkInIsLate($data['check_in_time'], $shiftStart);
        } else {
            $data['check_in_time'] = null;
            $data['check_out_time'] = null;
            $data['is_late'] = false;
        }

        return $data;
    }
}
