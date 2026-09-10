<?php

namespace App\Services;

use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class EmployeeBirthdayService
{
    /**
     * Reminders for birthdays exactly 7 or 1 day away, or today.
     *
     * @return Collection<int, array{id: int, name: string, birthday: string, days_until: int, reminder_type: string, message: string}>
     */
    public function remindersForShop(int $shopId, ?Carbon $today = null): Collection
    {
        $today = ($today ?? now())->startOfDay();

        return Employee::query()
            ->forShop($shopId)
            ->where('status', 'active')
            ->whereNotNull('birthday')
            ->orderBy('name')
            ->get()
            ->map(function (Employee $employee) use ($today) {
                $birthday = Carbon::parse($employee->birthday);
                $daysUntil = $this->daysUntilNextBirthday($birthday, $today);

                if (! in_array($daysUntil, [0, 1, 7], true)) {
                    return null;
                }

                $reminderType = match ($daysUntil) {
                    0 => 'today',
                    1 => 'day',
                    7 => 'week',
                };

                $message = match ($daysUntil) {
                    0 => "{$employee->name}'s birthday is today.",
                    1 => "{$employee->name}'s birthday is tomorrow.",
                    7 => "{$employee->name}'s birthday is in one week.",
                };

                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'birthday' => $birthday->format('Y-m-d'),
                    'birthday_label' => $birthday->format('M j'),
                    'days_until' => $daysUntil,
                    'reminder_type' => $reminderType,
                    'message' => $message,
                ];
            })
            ->filter()
            ->sortBy('days_until')
            ->values();
    }

    /**
     * Employees grouped by day-of-month for a calendar month.
     *
     * @return array<int, array<int, array<int, array{id: int, name: string, birthday: string, birthday_label: string}>>>
     */
    public function calendarForShop(int $shopId, int $year, int $month): array
    {
        $employees = Employee::query()
            ->forShop($shopId)
            ->whereNotNull('birthday')
            ->orderBy('name')
            ->get(['id', 'name', 'birthday', 'status']);

        $byDay = [];

        foreach ($employees as $employee) {
            $birthday = Carbon::parse($employee->birthday);
            if ((int) $birthday->month !== $month) {
                continue;
            }

            $day = (int) $birthday->day;
            $byDay[$day][] = [
                'id' => $employee->id,
                'name' => $employee->name,
                'birthday' => $birthday->format('Y-m-d'),
                'birthday_label' => $birthday->format('M j'),
                'status' => $employee->status,
            ];
        }

        ksort($byDay);

        return [
            'year' => $year,
            'month' => $month,
            'month_label' => Carbon::create($year, $month, 1)->format('F Y'),
            'days_in_month' => Carbon::create($year, $month, 1)->daysInMonth,
            'first_weekday' => (int) Carbon::create($year, $month, 1)->dayOfWeek,
            'by_day' => $byDay,
        ];
    }

    public function daysUntilNextBirthday(Carbon $birthday, Carbon $today): int
    {
        $next = Carbon::create($today->year, $birthday->month, $birthday->day)->startOfDay();

        if ($next->lt($today)) {
            $next->addYear();
        }

        return (int) $today->diffInDays($next);
    }

    public function formatBirthdayLabel(?string $birthday): ?string
    {
        if (! $birthday) {
            return null;
        }

        return Carbon::parse($birthday)->format('M j');
    }
}
