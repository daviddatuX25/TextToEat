<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Maintenance / Helper Script Security
    |--------------------------------------------------------------------------
    |
    | This password is used by the php-run-scripts dispatcher in production
    | to guard access to maintenance helpers (initial-setup, deploy-update,
    | reseed, etc.) when they are triggered via the web.
    |
    | It is strongly recommended to override this value in your server .env
    | using RUN_SCRIPTS_PASSWORD. The default here is only a fallback for
    | environments where editing .env is difficult.
    |
    */

    'run_scripts_password' => env('RUN_SCRIPTS_PASSWORD', '!Xcode092503'),
];

