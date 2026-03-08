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
require __DIR__ . '/helpers.php';

run_deploy_update($app);

