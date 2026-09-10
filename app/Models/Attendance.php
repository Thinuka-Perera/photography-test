<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = [
        'employee_id',
        'work_date',
        'status',
        'is_late',
        'check_in_time',
        'check_out_time',
        'notes',
    ];

    protected $casts = [
        'work_date' => 'date',
        'is_late' => 'boolean',
    ];

    protected $appends = [
        'worked_minutes',
        'worked_hours',
        'late_minutes',
        'ot_minutes',
        'is_late_computed',
    ];

    public static function lateAfterTime(): string
    {
        return RoleShiftSetting::defaultStartTime();
    }

    public static function checkInIsLate(?string $checkInTime, ?string $shiftStart = null): bool
    {
        if (! $checkInTime) {
            return false;
        }

        $shiftStart = RoleShiftSetting::normalizeTime($shiftStart ?? self::lateAfterTime());

        return substr($checkInTime, 0, 5) > $shiftStart;
    }

    public function resolveShiftStartTime(): string
    {
        $this->loadMissing('employee');

        return RoleShiftSetting::startTimeFor(
            $this->employee?->shop_id,
            $this->employee?->role ?? $this->employee?->job_role,
        );
    }

    public function resolveShiftEndTime(): string
    {
        $this->loadMissing('employee');

        return RoleShiftSetting::endTimeFor(
            $this->employee?->shop_id,
            $this->employee?->role ?? $this->employee?->job_role,
        );
    }

    public function resolvesAsLate(): bool
    {
        return $this->status === 'present' && (bool) $this->is_late;
    }

    public function getIsLateComputedAttribute(): bool
    {
        return $this->resolvesAsLate();
    }

    /**
     * Minutes between scheduled shift start and check-in (0 if on time or early).
     */
    public function calculateLateMinutes(?string $shiftStart = null): int
    {
        if ($this->status !== 'present' || ! $this->check_in_time) {
            return 0;
        }

        $shiftStart = RoleShiftSetting::normalizeTime($shiftStart ?? $this->resolveShiftStartTime());
        $checkIn = substr((string) $this->check_in_time, 0, 5);

        if ($checkIn <= $shiftStart) {
            return 0;
        }

        $date = $this->work_date?->format('Y-m-d') ?? now()->format('Y-m-d');
        $start = Carbon::parse($date.' '.$shiftStart);
        $checkInAt = Carbon::parse($date.' '.$this->check_in_time);

        return (int) $start->diffInMinutes($checkInAt);
    }

    public function getLateMinutesAttribute(): int
    {
        return $this->calculateLateMinutes();
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function calculateWorkedMinutes(): int
    {
        if ($this->status !== 'present') {
            return 0;
        }

        if (! $this->check_in_time || ! $this->check_out_time) {
            return 0;
        }

        $start = Carbon::parse($this->work_date->format('Y-m-d').' '.$this->check_in_time);
        $end = Carbon::parse($this->work_date->format('Y-m-d').' '.$this->check_out_time);

        // Night shift: checkout on the next calendar day (e.g. 07:45 → 06:20 next morning).
        if ($end->lessThanOrEqualTo($start)) {
            $end->addDay();
        }

        return $start->diffInMinutes($end);
    }

    public function getWorkedMinutesAttribute(): int
    {
        return $this->calculateWorkedMinutes();
    }

    public function getWorkedHoursAttribute(): float
    {
        return round($this->calculateWorkedMinutes() / 60, 2);
    }

    public function calculateOtMinutes(?string $shiftEnd = null): int
    {
        if ($this->status !== 'present' || ! $this->check_out_time) {
            return 0;
        }

        $shiftEnd = RoleShiftSetting::normalizeTime($shiftEnd ?? $this->resolveShiftEndTime());
        $checkOut = substr((string) $this->check_out_time, 0, 5);

        // Night shifts or checkout on a different day boundary
        $date = $this->work_date?->format('Y-m-d') ?? now()->format('Y-m-d');
        $end = Carbon::parse($date.' '.$shiftEnd);
        $checkOutAt = Carbon::parse($date.' '.$this->check_out_time);

        if ($this->check_in_time) {
             $start = Carbon::parse($date.' '.$this->check_in_time);
             if ($checkOutAt->lessThanOrEqualTo($start)) {
                 $checkOutAt->addDay();
             }
        }

        if ($checkOutAt->lessThanOrEqualTo($end)) {
            return 0;
        }

        return (int) $end->diffInMinutes($checkOutAt);
    }

    public function getOtMinutesAttribute(): int
    {
        return $this->calculateOtMinutes();
    }
}
