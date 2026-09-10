<?php

namespace Tests\Unit;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\SalaryLedgerEntry;
use App\Models\SalaryProfile;
use App\Services\PayrollService;
use Illuminate\Support\Collection;
use Tests\TestCase;

class PayrollCalculationTest extends TestCase
{
    /**
     * Test Overtime Calculation.
     * Rule: 200 hours standard per month.
     * OT should only be calculated when worked hours exceed 200.
     * Formula: (Worked Hours - 200) * OT Rate.
     */
    public function test_overtime_calculation(): void
    {
        $service = new PayrollService();

        $employee = new Employee([
            'name' => 'John Doe',
            'role' => 'editor',
        ]);

        $profile = new SalaryProfile([
            'basic_salary' => 50000,
            'attendance_allowance' => 5000,
            'overtime_rate' => 150,
        ]);

        // Mock calculateWorkedMinutes and calculateOtMinutes
        $attendance = $this->getMockBuilder(Attendance::class)
            ->onlyMethods(['calculateWorkedMinutes', 'calculateOtMinutes'])
            ->getMock();
        $attendance->status = 'present';
        $attendance->method('calculateWorkedMinutes')->willReturn(12900);
        $attendance->method('calculateOtMinutes')->willReturn(900); // 15 hours * 60 minutes = 900 minutes

        $attendanceRecords = collect([$attendance]);
        $ledgerEntries = collect();

        $summary = $service->calculateMonthlySummary(
            $employee,
            $profile,
            $attendanceRecords,
            $ledgerEntries
        );

        $this->assertEquals(215, $summary['worked_hours']);
        $this->assertEquals(15, $summary['overtime_hours']);
        $this->assertEquals(2250, $summary['overtime_pay']); // 15 * 150
    }

    /**
     * Test Leave calculations and Leave Encashment / Deductions.
     * Allowed: 4 personal leave days.
     * Front Office rate: Rs. 1300.
     */
    public function test_leave_calculations_front_office(): void
    {
        $service = new PayrollService();

        // Scenario A: Used 3 leaves, 1 remaining (Bonus = 1 * 1300 = 1300)
        $employeeA = new Employee([
            'name' => 'FO Staff A',
            'role' => 'front_office',
        ]);
        $profileA = new SalaryProfile([
            'basic_salary' => 30000,
        ]);

        $attendanceA = collect([
            new Attendance(['status' => 'leave']),
            new Attendance(['status' => 'leave']),
            new Attendance(['status' => 'leave']),
        ]);

        $summaryA = $service->calculateMonthlySummary($employeeA, $profileA, $attendanceA, collect());

        $this->assertEquals(3, $summaryA['leave_days']);
        $this->assertEquals(1, $summaryA['remaining_leave_count']);
        $this->assertEquals(1300, $summaryA['leave_bonus']);
        $this->assertEquals(0, $summaryA['leave_deduction']);

        // Scenario B: Used 6 leaves, 2 exceeded (Deduction = 2 * 1300 = 2600)
        $attendanceB = collect([
            new Attendance(['status' => 'leave']),
            new Attendance(['status' => 'leave']),
            new Attendance(['status' => 'leave']),
            new Attendance(['status' => 'leave']),
            new Attendance(['status' => 'leave']),
            new Attendance(['status' => 'leave']),
        ]);

        $summaryB = $service->calculateMonthlySummary($employeeA, $profileA, $attendanceB, collect());

        $this->assertEquals(6, $summaryB['leave_days']);
        $this->assertEquals(0, $summaryB['remaining_leave_count']);
        $this->assertEquals(0, $summaryB['leave_bonus']);
        $this->assertEquals(2600, $summaryB['leave_deduction']);
    }

    /**
     * Test Leave calculations and Leave Encashment / Deductions.
     * Allowed: 4 personal leave days.
     * Editor rate: Rs. 1600.
     */
    public function test_leave_calculations_editor(): void
    {
        $service = new PayrollService();

        // Scenario A: Used 1 leave, 3 remaining (Bonus = 3 * 1600 = 4800)
        $employee = new Employee([
            'name' => 'Editor Staff A',
            'role' => 'editor',
        ]);
        $profile = new SalaryProfile([
            'basic_salary' => 40000,
        ]);

        $attendanceA = collect([
            new Attendance(['status' => 'leave']),
        ]);

        $summaryA = $service->calculateMonthlySummary($employee, $profile, $attendanceA, collect());

        $this->assertEquals(1, $summaryA['leave_days']);
        $this->assertEquals(3, $summaryA['remaining_leave_count']);
        $this->assertEquals(4800, $summaryA['leave_bonus']);
        $this->assertEquals(0, $summaryA['leave_deduction']);
    }

    /**
     * Test Commission Amount calculation.
     * Summing ledger entries with "commission" in title.
     */
    public function test_commission_aggregation(): void
    {
        $service = new PayrollService();

        $employee = new Employee([
            'name' => 'Editor B',
            'role' => 'editor',
        ]);
        $profile = new SalaryProfile([
            'basic_salary' => 40000,
        ]);

        $ledgerEntries = collect([
            new SalaryLedgerEntry(['type' => 'allowance', 'title' => 'Commission Bill #123', 'amount' => 1500]),
            new SalaryLedgerEntry(['type' => 'allowance', 'title' => 'Commission Bill #124', 'amount' => 2000]),
            new SalaryLedgerEntry(['type' => 'allowance', 'title' => 'Travel Allowance', 'amount' => 1000]),
            new SalaryLedgerEntry(['type' => 'deduction', 'title' => 'Late deduction', 'amount' => 500]),
        ]);

        $summary = $service->calculateMonthlySummary($employee, $profile, collect(), $ledgerEntries);

        // Commission Amount = 1500 + 2000 = 3500
        $this->assertEquals(3500, $summary['commission_amount']);
        // Ledger Allowance = 1500 + 2000 + 1000 = 4500
        $this->assertEquals(4500, $summary['ledger_allowance']);
        // Gross Salary = 40000 (basic) + 4500 (ledger_allowance) + 6400 (leave bonus: 4 * 1600) = 50900
        $this->assertEquals(50900, $summary['gross_salary']);
    }

    /**
     * Test Dealer Payroll Calculation.
     * Dealers should have basic salary, attendance allowance, overtime, and leaves forced to 0.
     * Only ledger/POS commissions should calculate.
     */
    public function test_dealer_payroll_calculation(): void
    {
        $service = new PayrollService();

        $employee = new Employee([
            'name' => 'John Dealer',
            'role' => 'dealer',
            'basic_salary' => 50000,
            'attendance_allowance' => 5000,
            'overtime_rate' => 150,
        ]);

        $profile = new SalaryProfile([
            'basic_salary' => 50000,
            'attendance_allowance' => 5000,
            'overtime_rate' => 150,
        ]);

        // Mock present attendance with worked/overtime hours
        $attendance = $this->getMockBuilder(Attendance::class)
            ->onlyMethods(['calculateWorkedMinutes', 'calculateOtMinutes'])
            ->getMock();
        $attendance->status = 'present';
        $attendance->method('calculateWorkedMinutes')->willReturn(15000); // 250 hours
        $attendance->method('calculateOtMinutes')->willReturn(3000); // 50 hours

        $ledgerEntries = collect([
            new SalaryLedgerEntry(['type' => 'allowance', 'title' => 'Dealer Commission Bill #101', 'amount' => 12500]),
            new SalaryLedgerEntry(['type' => 'allowance', 'title' => 'Travel Allowance', 'amount' => 1000]),
            new SalaryLedgerEntry(['type' => 'deduction', 'title' => 'Other Deduction', 'amount' => 500]),
        ]);

        $summary = $service->calculateMonthlySummary($employee, $profile, collect([$attendance]), $ledgerEntries);

        // Assert basic components are zeroed out
        $this->assertEquals(0.0, $summary['basic_salary']);
        $this->assertEquals(0.0, $summary['attendance_allowance_base']);
        $this->assertEquals(0.0, $summary['attendance_allowance_earned']);
        $this->assertEquals(0.0, $summary['overtime_pay']);
        $this->assertEquals(0.0, $summary['leave_bonus']);
        $this->assertEquals(0.0, $summary['leave_deduction']);
        $this->assertEquals(0.0, $summary['daily_rate']);

        // Assert ledger allowances/commissions still compile
        $this->assertEquals(12500, $summary['commission_amount']);
        $this->assertEquals(13500, $summary['ledger_allowance']);
        $this->assertEquals(500, $summary['ledger_deduction']);
        
        // Gross Salary = basic(0) + att_earned(0) + ot_pay(0) + ledger_allowance(13500) + leave_bonus(0) = 13500
        $this->assertEquals(13500, $summary['gross_salary']);
        // Net Salary = gross_salary(13500) - total_deductions(500) = 13000
        $this->assertEquals(13000, $summary['net_salary']);
    }
}

