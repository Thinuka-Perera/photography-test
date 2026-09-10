<?php

namespace Tests\Unit;

use App\Models\Attendance;
use Tests\TestCase;

class AttendanceLateTest extends TestCase
{
    public function test_check_in_is_late_after_threshold(): void
    {
        $this->assertTrue(Attendance::checkInIsLate('09:01', '09:00'));
        $this->assertFalse(Attendance::checkInIsLate('09:00', '09:00'));
        $this->assertFalse(Attendance::checkInIsLate('08:30', '09:00'));
    }

    public function test_resolves_as_late_uses_stored_flag_only(): void
    {
        $attendance = new Attendance([
            'status' => 'present',
            'check_in_time' => '10:15:00',
            'is_late' => true,
        ]);

        $this->assertTrue($attendance->resolvesAsLate());

        $attendance->is_late = false;

        $this->assertFalse($attendance->resolvesAsLate());
    }

    public function test_calculate_late_minutes_from_shift_start(): void
    {
        $attendance = new Attendance([
            'status' => 'present',
            'work_date' => '2026-05-01',
            'check_in_time' => '09:20:00',
        ]);

        $this->assertSame(20, $attendance->calculateLateMinutes('09:00'));
    }

    public function test_calculate_late_minutes_zero_when_on_time_or_early(): void
    {
        $onTime = new Attendance([
            'status' => 'present',
            'work_date' => '2026-05-01',
            'check_in_time' => '09:00:00',
        ]);
        $early = new Attendance([
            'status' => 'present',
            'work_date' => '2026-05-01',
            'check_in_time' => '08:30:00',
        ]);

        $this->assertSame(0, $onTime->calculateLateMinutes('09:00'));
        $this->assertSame(0, $early->calculateLateMinutes('09:00'));
    }

    public function test_calculate_late_minutes_over_one_hour(): void
    {
        $attendance = new Attendance([
            'status' => 'present',
            'work_date' => '2026-05-01',
            'check_in_time' => '10:15:00',
        ]);

        $this->assertSame(75, $attendance->calculateLateMinutes('09:00'));
    }

    public function test_late_minutes_not_counted_when_flag_cleared(): void
    {
        $attendance = new Attendance([
            'status' => 'present',
            'work_date' => '2026-05-01',
            'check_in_time' => '09:30:00',
            'is_late' => false,
        ]);

        $this->assertSame(30, $attendance->calculateLateMinutes('09:00'));
        $this->assertFalse($attendance->resolvesAsLate());
    }
}
