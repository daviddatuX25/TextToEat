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

        echo "Deployment update complete.\n";
    }
}

if (! function_exists('run_reseed')) {
    /**
     * Dangerous reseed helper: migrate:fresh --seed.
     */
    function run_reseed(Application $app): void
    {
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
        } catch (\Throwable $e) {
            echo "!!! Error running migrate:fresh --seed: " . $e->getMessage() . "\n";
            exit(1);
        }

        echo "Database reseed complete.\n";
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
                run_reseed($app);

                return true;
            default:
                echo "Unknown script: {$script}\n";
                echo "Allowed scripts: initial-setup, deploy-update, reseed\n";

                return false;
        }
    }
}

