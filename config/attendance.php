<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Late check-in threshold
    |--------------------------------------------------------------------------
    |
    | Present records with check-in after this time (H:i) count as late unless
    | manually cleared. Night-shift staff can uncheck "Late" when saving.
    |
    */
    'late_after' => env('ATTENDANCE_LATE_AFTER', '09:00'),

    /*
    |--------------------------------------------------------------------------
    | Allowed personal leave days per month (payroll policy)
    |--------------------------------------------------------------------------
    */
    'allowed_leaves_per_month' => 4,

];
