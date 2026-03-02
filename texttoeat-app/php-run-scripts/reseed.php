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
require __DIR__ . '/helpers.php';

run_reseed($app);

