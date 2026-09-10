<?php

return [
    /*
    |--------------------------------------------------------------------------
    | POS Tax Rate
    |--------------------------------------------------------------------------
    | Default tax rate percentage applied to all sales.
    | Can be overridden per sale via the options.tax_rate param.
    | Set to 0 for tax-exempt operations.
    */
    'tax_rate' => env('POS_TAX_RATE', 0),
];
