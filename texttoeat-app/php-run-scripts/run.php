<?php

/**
 * Run whitelisted Artisan commands from hosting panel "Run PHP" or similar.
 * Usage: php run.php <command> [--option=value ...]
 *   or via web (dev only): run.php?cmd=key:generate
 *
 * Allowed commands: key:generate, storage:link, config:cache, route:cache, migrate
 * For migrate, --force is added automatically when not in CLI.
 */

$app = require __DIR__ . '/bootstrap.php';

$allowed = [
    'key:generate' => [],
    'storage:link' => [],
    'config:cache' => [],
    'route:cache'  => [],
    'migrate'      => ['--force' => true],
];

$command = null;
$params = [];

if (php_sapi_name() === 'cli') {
    $argv = $GLOBALS['argv'] ?? [];
    $command = $argv[1] ?? null;
    for ($i = 2; $i < count($argv); $i++) {
        if (strpos($argv[$i], '--') === 0) {
            $parts = explode('=', substr($argv[$i], 2), 2);
            $params[$parts[0]] = $parts[1] ?? true;
        }
    }
} else {
    $command = $_GET['cmd'] ?? $_POST['cmd'] ?? null;
    if ($command !== null) {
        $command = trim($command);
    }
}

if ($command === null || $command === '') {
    echo "Usage: php run.php <command>\nAllowed: " . implode(', ', array_keys($allowed)) . "\n";
    exit(1);
}

if (!isset($allowed[$command])) {
    echo "Command not allowed: {$command}\nAllowed: " . implode(', ', array_keys($allowed)) . "\n";
    exit(1);
}

$params = array_merge($allowed[$command], $params);

try {
    Illuminate\Support\Facades\Artisan::call($command, $params);
    $out = Illuminate\Support\Facades\Artisan::output();
    echo $out;
    exit(0);
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
