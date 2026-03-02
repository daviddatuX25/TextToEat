<?php

/**
 * Deployment update helper for codebase changes.
 *
 * Intended to be run after pulling new code or uploading a new build:
 * - Run database migrations (with --force)
 * - Rebuild config and route cache
 *
 * Usage (from app root):
 *   php php-run-scripts/deploy-update.php
 *
 * Or from a hosting panel "Run PHP" pointing at this file.
 */

$app = require __DIR__ . '/bootstrap.php';

use Illuminate\Support\Facades\Artisan;

$steps = [
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

echo "Deployment update complete.\n";

