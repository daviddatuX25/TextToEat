<?php

/**
 * php-run-scripts dispatcher with a simple HTML form.
 *
 * - GET  /php-run-scripts/run.php: shows form
 * - POST /php-run-scripts/run.php: runs a whitelisted script
 *
 * In production:
 * - Requires password (RUN_SCRIPTS_PASSWORD).
 * - Only runs whitelisted scripts: initial-setup, deploy-update, reseed.
 * - Custom Artisan commands are NOT allowed.
 */

define('PHP_RUN_SCRIPTS_ALLOW_WEB', true);

$app = require __DIR__ . '/bootstrap.php';
require __DIR__ . '/helpers.php';

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Artisan;

/**
 * Read a value from a .env file on disk.
 * This avoids relying on getenv()/$_ENV which may be restricted on shared hosts.
 */
function dotenv_value(string $key, string $envFilePath): ?string
{
    if (! is_file($envFilePath) || ! is_readable($envFilePath)) {
        return null;
    }

    $lines = @file($envFilePath, FILE_IGNORE_NEW_LINES);
    if (! is_array($lines)) {
        return null;
    }

    $prefix = $key . '=';
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (! str_starts_with($line, $prefix)) {
            continue;
        }

        $value = substr($line, strlen($prefix));
        $value = trim($value);

        // Strip surrounding quotes if present.
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }

        return $value;
    }

    return null;
}

function render_form(string $env, string $message = ''): void
{
    header('Content-Type: text/html; charset=utf-8');
    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Maintenance scripts</title>
</head>
<body>
    <h1>Maintenance scripts</h1>
    <p>Environment: <strong><?php echo htmlspecialchars($env, ENT_QUOTES, 'UTF-8'); ?></strong></p>

    <?php if ($message !== ''): ?>
        <pre><?php echo htmlspecialchars($message, ENT_QUOTES, 'UTF-8'); ?></pre>
    <?php endif; ?>

    <form method="post">
        <div>
            <label>
                Password:
                <input type="password" name="password" required>
            </label>
        </div>

        <div>
            <label>
                Script:
                <select name="script" required>
                    <option value="initial-setup">initial-setup</option>
                    <option value="deploy-update">deploy-update</option>
                    <option value="reseed">reseed (dev / staging)</option>
                    <option value="force-reseed">force-reseed (DANGEROUS: wipes DB; requires ALLOW_FORCE_RESEED=true)</option>
                </select>
            </label>
        </div>

        <?php if ($env !== 'production'): ?>
            <div>
                <label>
                    Custom Artisan command (dev only):
                    <input type="text" name="custom_command" placeholder="e.g. cache:clear">
                </label>
            </div>
        <?php endif; ?>

        <div>
            <button type="submit">Run</button>
        </div>
    </form>
</body>
</html>
    <?php
}

function handle_cli(Application $app, array $argv): void
{
    $script = $argv[1] ?? null;
    if (!is_string($script) || $script === '') {
        echo "Usage: php php-run-scripts/run.php <script>\n";
        echo "Allowed scripts: initial-setup, deploy-update, reseed\n";
        exit(1);
    }

    $ok = run_script_by_name($app, $script);
    exit($ok ? 0 : 1);
}

function handle_http(Application $app): void
{
    $env = $app->environment();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        render_form($env);
        exit(0);
    }

    if ($method !== 'POST') {
        http_response_code(405);
        header('Allow: GET, POST');
        echo "Method Not Allowed.\n";
        exit(1);
    }

    // Read form body (we don’t need JSON for the browser form, but it’s fine).
    $input = $_POST;
    if ($input === [] && isset($_SERVER['CONTENT_TYPE']) && str_starts_with($_SERVER['CONTENT_TYPE'], 'application/json')) {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?? '', true);
        if (is_array($decoded)) {
            $input = $decoded;
        }
    }

    $password      = (string)($input['password'] ?? '');
    $script        = trim((string)($input['script'] ?? ''));
    $customCommand = trim((string)($input['custom_command'] ?? ''));

    // Password required in production
    if ($env === 'production') {
        $expected = (string) config('maintenance.run_scripts_password', '');
        if ($expected === '') {
            // Fallback when config isn't loaded/cached yet on the server.
            // Try env()/getenv() first, then parse .env from disk.
            $expected = (string) (function_exists('env') ? env('RUN_SCRIPTS_PASSWORD', '') : '');
            if ($expected === '') {
                $expected = (string) (getenv('RUN_SCRIPTS_PASSWORD') ?: ($_ENV['RUN_SCRIPTS_PASSWORD'] ?? ''));
            }
            if ($expected === '') {
                $expected = (string) (dotenv_value('RUN_SCRIPTS_PASSWORD', dirname(__DIR__) . '/.env') ?? '');
            }
        }
        if ($expected === '') {
            http_response_code(500);
            render_form($env, "RUN_SCRIPTS_PASSWORD is not configured or not readable. Ensure it exists in the server .env (app root) and re-upload.");
            exit(1);
        }
        if (! hash_equals($expected, $password)) {
            http_response_code(403);
            render_form($env, "Forbidden: wrong password.");
            exit(1);
        }
    }

    // Custom commands only allowed outside production
    if ($customCommand !== '' && $env !== 'production') {
        ob_start();
        try {
            Artisan::call($customCommand);
            $out = Artisan::output();
            echo ">>> artisan {$customCommand}\n";
            echo $out !== '' ? $out : "(ok)\n";
            $output = ob_get_clean();
            render_form($env, $output);
            exit(0);
        } catch (\Throwable $e) {
            $output = ob_get_clean();
            render_form($env, $output . "\n!!! Error: " . $e->getMessage());
            exit(1);
        }
    }

    if ($script === '') {
        http_response_code(400);
        render_form($env, "Missing script.");
        exit(1);
    }

    ob_start();
    $ok = run_script_by_name($app, $script);
    $output = ob_get_clean();

    render_form($env, $output);
    exit($ok ? 0 : 1);
}

if (php_sapi_name() === 'cli') {
    handle_cli($app, $argv);
} else {
    handle_http($app);
}