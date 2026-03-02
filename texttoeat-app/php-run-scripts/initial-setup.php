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
require __DIR__ . '/helpers.php';

run_initial_setup($app);

