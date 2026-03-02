<?php

/**
 * Initial production setup helper.
 *
 * Intended to be run once after a fresh deploy:
 * - Generate APP_KEY
 * - Create storage symlink
 * - Run database migrations (with --force)
 * - Cache config and routes
 *
 * Usage (from app root):
 *   php php-run-scripts/initial-setup.php
 *
 * Or from a hosting panel "Run PHP" pointing at this file.
 */

$app = require __DIR__ . '/bootstrap.php';

use Illuminate\Support\Facades\Artisan;

$steps = [
    'key:generate' => [],
    'storage:link' => [],
    'migrate'      => ['--force' => true],
    'config:cache' => [],
    'route:cache'  => [],
];

foreach ($steps as $command => $params) {
    try {
        Artisan::call($command, $params);
        $output = Artisan::output();
        if ($output !== '') {
            echo ">>> {$command}\n{$output}\n";
        } else {
            echo ">>> {$command} (ok)\n";
        }
    } catch (Throwable $e) {
        echo "!!! Error running {$command}: " . $e->getMessage() . "\n";
        exit(1);
    }
}

echo "Initial setup complete.\n";

