<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Artisan;

if (! function_exists('run_initial_setup')) {
    /**
     * One-time initial setup: key:generate, storage:link, migrate, config:cache, route:cache.
     */
    function run_initial_setup(Application $app): void
    {
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
            } catch (\Throwable $e) {
                echo "!!! Error running {$command}: " . $e->getMessage() . "\n";
                exit(1);
            }
        }

        echo "Initial setup complete.\n";
    }
}

if (! function_exists('run_deploy_update')) {
    /**
     * Deployment update: migrate, config:cache, route:cache.
     */
    function run_deploy_update(Application $app): void
    {
        $steps = [
            'package:discover' => ['--ansi' => false],
            'migrate'          => ['--force' => true],
            'config:cache'     => [],
            'route:cache'      => [],
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
            } catch (\Throwable $e) {
                echo "!!! Error running {$command}: " . $e->getMessage() . "\n";
                exit(1);
            }
        }

        echo "Deployment update complete.\n";
    }
}

if (! function_exists('run_reseed')) {
    /**
     * Dangerous reseed helper: migrate:fresh --seed.
     *
     * In production, this only runs when $force is true AND ALLOW_FORCE_RESEED=true
     * is present in the server .env. This is an explicit, opt-in safety flag.
     */
    function run_reseed(Application $app, bool $force = false): void
    {
        $envName = $app->environment();

        if ($envName === 'production') {
            if (! $force) {
                echo "Refusing to run migrate:fresh --seed in production.\n";
                echo "If you really want to wipe this database, use the 'force-reseed' script and set ALLOW_FORCE_RESEED=true in the server .env.\n";

                exit(1);
            }

            // Extra guardrail: require explicit ALLOW_FORCE_RESEED=true in .env.
            $flag = false;
            if (function_exists('env')) {
                $flag = env('ALLOW_FORCE_RESEED', false);
            } else {
                $raw = getenv('ALLOW_FORCE_RESEED');
                if ($raw === false && isset($_ENV['ALLOW_FORCE_RESEED'])) {
                    $raw = $_ENV['ALLOW_FORCE_RESEED'];
                }
                $flag = $raw;
            }

            if (is_string($flag)) {
                $flag = strtolower($flag) === 'true';
            } else {
                $flag = (bool) $flag;
            }

            if (! $flag) {
                echo "Force reseed is disabled. Set ALLOW_FORCE_RESEED=true in the server .env to enable 'force-reseed'.\n";

                exit(1);
            }
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
        } catch (\Throwable $e) {
            echo "!!! Error running migrate:fresh --seed: " . $e->getMessage() . "\n";
            exit(1);
        }

        echo "Database reseed complete.\n";
    }
}

if (! function_exists('run_menu_reset')) {
    /**
     * Reset today's menu: rollover yesterday to today, reset today items to disabled with zero stock, flag greeting modal.
     */
    function run_menu_reset(Application $app): void
    {
        try {
            Artisan::call('menu:reset-today', ['--force' => true]);
            $output = Artisan::output();
            if ($output !== '') {
                echo ">>> menu:reset-today --force\n{$output}\n";
            } else {
                echo ">>> menu:reset-today --force (ok)\n";
            }
        } catch (\Throwable $e) {
            echo "!!! Error running menu:reset-today: " . $e->getMessage() . "\n";
            exit(1);
        }
        echo "Menu reset complete. Greeting modal will show for portal users.\n";
    }
}

if (! function_exists('run_schedule_cron_info')) {
    /**
     * Print the cron line and instructions for Laravel's scheduler (no side effects).
     */
    function run_schedule_cron_info(Application $app): void
    {
        $appRoot = realpath($app->basePath()) ?: $app->basePath();
        $cronLine = '* * * * * cd ' . $appRoot . ' && php artisan schedule:run >> /dev/null 2>&1';
        $hestiaLine = '* * * * * /usr/bin/php8.2 ' . $appRoot . '/artisan schedule:run >> /dev/null 2>&1';
        echo "Add this single cron job (runs every minute) so Laravel's scheduler can run:\n";
        echo "  - menu:reset-today (when enabled in Portal → Menu settings)\n";
        echo "  - sms:mark-old-pending-failed (every 10 min)\n";
        echo "  - chatbot:expire-takeover-sessions (every 10 min)\n\n";
        echo "Cron line (generic; copy into your hosting panel → Cron Jobs):\n\n";
        echo $cronLine . "\n\n";
        echo "Hestia (use full path to php8.2 and artisan):\n\n";
        echo $hestiaLine . "\n\n";
        echo "Replace the path above if your app root is different on this server.\n";
    }
}

if (! function_exists('run_script_by_name')) {
    /**
     * Dispatch helper to run a named maintenance script.
     *
     * @return bool true on success, false on unknown script
     */
    function run_script_by_name(Application $app, string $script): bool
    {
        switch ($script) {
            case 'initial-setup':
                run_initial_setup($app);

                return true;
            case 'deploy-update':
                run_deploy_update($app);

                return true;
            case 'reseed':
                run_reseed($app, false);

                return true;
            case 'force-reseed':
                run_reseed($app, true);

                return true;
            case 'menu-reset':
                run_menu_reset($app);

                return true;
            case 'schedule-cron-info':
                run_schedule_cron_info($app);

                return true;
            default:
                echo "Unknown script: {$script}\n";
                echo "Allowed scripts: initial-setup, deploy-update, reseed, force-reseed, menu-reset, schedule-cron-info\n";

                return false;
        }
    }
}

