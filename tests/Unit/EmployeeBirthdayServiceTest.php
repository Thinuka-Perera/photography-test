<?php

namespace Tests\Unit;

use App\Services\EmployeeBirthdayService;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class EmployeeBirthdayServiceTest extends TestCase
{
    public function test_days_until_next_birthday_handles_year_wrap(): void
    {
        $service = new EmployeeBirthdayService();

        $today = Carbon::parse('2026-12-26');
        $birthday = Carbon::parse('1990-01-02');

        $this->assertSame(7, $service->daysUntilNextBirthday($birthday, $today));
    }

    public function test_days_until_next_birthday_is_zero_on_the_day(): void
    {
        $service = new EmployeeBirthdayService();

        $today = Carbon::parse('2026-05-20');
        $birthday = Carbon::parse('1992-05-20');

        $this->assertSame(0, $service->daysUntilNextBirthday($birthday, $today));
    }
}
