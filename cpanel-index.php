<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| cPanel Entry Point
|--------------------------------------------------------------------------
| public_html/index.php  →  ~/photograpy-pos-/  (Laravel app root)
|
| dirname(__DIR__) resolves to the cPanel home directory when this file
| lives in public_html (e.g. /home/arachchipossyste).
*/
$appRoot = dirname(__DIR__) . '/photograpy-pos-';

// Maintenance mode check
if (file_exists($maintenance = $appRoot . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Composer autoloader
require $appRoot . '/vendor/autoload.php';

// Bootstrap Laravel and handle the request
/** @var Application $app */
$app = require_once $appRoot . '/bootstrap/app.php';

$app->handleRequest(Request::capture());
