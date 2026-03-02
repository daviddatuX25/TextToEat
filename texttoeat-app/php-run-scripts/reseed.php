<?php

/**
 * Dangerous reseed helper: migrate:fresh --seed.
 *
 * This will DROP ALL TABLES and re-run all migrations and seeders.
 * It is intended for development or disposable environments only.
 *
 * Usage (from app root):
 *   php php-run-scripts/reseed.php
 *
 * Or from a hosting panel "Run PHP" pointing at this file.
 */

$app = require __DIR__ . '/bootstrap.php';

use Illuminate\Support\Facades\Artisan;

$env = $app->environment();

if ($env === 'production') {
    echo "Refusing to run migrate:fresh --seed in production.\n";
    exit(1);
}

try {
    Artisan::call('migrate:fresh', [
        '--seed'  => true,
        '--force' => true,
    ]);
    $output = Artisan::output();
    if ($output !== '') {
        echo ">>> migrate:fresh --seed\n{$output}\n";
    } else {
        echo ">>> migrate:fresh --seed (ok)\n";
    }
} catch (Throwable $e) {
    echo "!!! Error running migrate:fresh --seed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "Database reseed complete.\n";

