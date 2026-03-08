<?php

/**
 * Bootstrap the Laravel application for php-run-scripts helpers.
 *
 * - Locates the app root (one level above this directory)
 * - Loads Composer autoload
 * - Boots the console kernel
 * - In production, refuses to run when invoked via the web (non-CLI)
 *
 * Returns the bootstrapped Illuminate\Foundation\Application instance.
 */

$appRoot = dirname(__DIR__);

if (!is_file($appRoot . '/vendor/autoload.php')) {
    die("Laravel app not found. Expected vendor/ at: {$appRoot}\n");
}

chdir($appRoot);

require $appRoot . '/vendor/autoload.php';

$app = require $appRoot . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// In production, refuse to run via web (defense in depth with .htaccess),
// except when explicitly allowed by the dispatcher (run.php).
if (php_sapi_name() !== 'cli' && ! defined('PHP_RUN_SCRIPTS_ALLOW_WEB')) {
    $env = $app->environment();
    if ($env === 'production') {
        header('HTTP/1.1 403 Forbidden');
        die('This script must be run from the command line or your hosting panel in production.');
    }
}

return $app;

