<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\SalaryLedgerEntry;
use App\Models\SalaryProfile;
use Illuminate\Support\Collection;

class PayrollService
{
    public const EXPECTED_MONTHLY_HOURS = 200;

    public const WORKING_DAYS_PER_MONTH = 25;

    public const FREE_LEAVES = 5;

    /**
     * @param  Collection<int, Attendance>  $attendanceRecords
     * @param  Collection<int, SalaryLedgerEntry>  $ledgerEntries
     */
    public function calculateMonthlySummary(
        Employee $employee,
        ?SalaryProfile $profile,
        Collection $attendanceRecords,
        Collection $ledgerEntries,
    ): array {
        $role = strtolower($employee->role ?? '');
        $jobRole = strtolower($employee->job_role ?? '');
        $isDealer = str_contains($role, 'dealer') || str_contains($jobRole, 'dealer');

        // Fallback to employee properties if profile is null
        $basicSalary = $isDealer ? 0.0 : (float) ($profile?->basic_salary ?? $employee->basic_salary ?? 0);
        $attendanceAllowanceBase = $isDealer ? 0.0 : (float) ($profile?->attendance_allowance ?? $employee->attendance_allowance ?? 0);
        $overtimeRate = $isDealer ? 0.0 : (float) ($profile?->overtime_rate ?? $employee->overtime_rate ?? 0);

        $workedMinutes = 0;
        $otMinutes = 0;
        $presentDays = 0;
        $leaveDays = 0;

        foreach ($attendanceRecords as $record) {
            if ($record->status === 'leave') {
                $leaveDays++;
                continue;
            }

            if ($record->status === 'present') {
                $presentDays++;
                $workedMinutes += $record->calculateWorkedMinutes();
                $otMinutes += $record->calculateOtMinutes();
            }
        }

        $workedHours = round($workedMinutes / 60, 2);
        $overtimeHours = round($otMinutes / 60, 2);
        
        $regularMinutes = max(0, $workedMinutes - $otMinutes);
        $regularHours = round($regularMinutes / 60, 2);

        $attendanceAllowanceEarned = ($isDealer || self::EXPECTED_MONTHLY_HOURS <= 0)
            ? 0.0
            : round($attendanceAllowanceBase * (min($regularHours, self::EXPECTED_MONTHLY_HOURS) / self::EXPECTED_MONTHLY_HOURS), 2);
        $overtimePay = $isDealer ? 0.0 : round($overtimeHours * $overtimeRate, 2);

        // Daily rate fallback
        $dailyRate = ($isDealer || self::WORKING_DAYS_PER_MONTH <= 0)
            ? 0.0
            : round($basicSalary / self::WORKING_DAYS_PER_MONTH, 2);

        // Custom Leave Policy: 4 personal leave days allowed
        $leaveRate = 0.0;

        if (!$isDealer) {
            if ($role === 'editor' || $jobRole === 'editor') {
                $leaveRate = 1600.0;
            } elseif ($role === 'front_office' || $role === 'front_officer' || $jobRole === 'front_office' || $jobRole === 'front_officer') {
                $leaveRate = 1300.0;
            }
        }

        $allowedLeaves = 4;
        $remainingLeaves = max(0, $allowedLeaves - $leaveDays);
        $exceededLeaves = max(0, $leaveDays - $allowedLeaves);

        $leaveBonus = round($remainingLeaves * $leaveRate, 2);
        $leaveDeduction = round($exceededLeaves * $leaveRate, 2);

        $ledgerAllowance = (float) $ledgerEntries
            ->where('type', 'allowance')
            ->sum('amount');
        $ledgerDeduction = (float) $ledgerEntries
            ->where('type', 'deduction')
            ->sum('amount');

        // Sum commission amounts from allowances having "commission" in their title
        $commissionAmount = (float) $ledgerEntries
            ->where('type', 'allowance')
            ->filter(fn ($entry) => stripos($entry->title ?? '', 'commission') !== false)
            ->sum('amount');

        $grossSalary = round(
            $basicSalary
            + $attendanceAllowanceEarned
            + $overtimePay
            + $ledgerAllowance
            + $leaveBonus,
            2,
        );
        $totalDeductions = round($leaveDeduction + $ledgerDeduction, 2);
        $netSalary = round($grossSalary - $totalDeductions, 2);

        return [
            'basic_salary' => $basicSalary,
            'attendance_allowance_base' => $attendanceAllowanceBase,
            'attendance_allowance_earned' => $attendanceAllowanceEarned,
            'worked_hours' => $workedHours,
            'worked_minutes' => $workedMinutes,
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
            'overtime_minutes' => $otMinutes,
            'regular_minutes' => $regularMinutes,
            'overtime_pay' => $overtimePay,
            'present_days' => $presentDays,
            'leave_days' => $leaveDays,
            'remaining_leave_count' => $remainingLeaves,
            'leave_bonus' => $leaveBonus,
            'leave_deduction' => $leaveDeduction,
            'leave_encashment' => $leaveBonus, // backward compatibility
            'ledger_allowance' => round($ledgerAllowance, 2),
            'ledger_deduction' => round($ledgerDeduction, 2),
            'commission_amount' => round($commissionAmount, 2),
            'gross_salary' => $grossSalary,
            'total_deductions' => $totalDeductions,
            'net_salary' => $netSalary,
            'daily_rate' => $dailyRate,
        ];
    }
}
