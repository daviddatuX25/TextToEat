#!/usr/bin/env bash
# Build texttoeat-app for manual deploy using Docker.
# Run from repo root. Optional: copy .env.prod.example to .env.prod and fill
# VITE_* (and other vars) so the frontend build gets the right values.
#
# When Laravel Sail is present (vendor/bin/sail): npm runs inside Sail; production
# composer runs only on the deploy copy so your dev vendor (Sail, PHPUnit, etc.)
# is not stripped from texttoeat-app/.
#
# Otherwise: composer --no-dev + Node container on texttoeat-app (removes dev deps
# from that folder until you run composer install again).
#
# Prerequisites: Docker running; first Sail run may build images (slow once).
#
# Output: timestamped folder under deploy-builds/
# Usage:
#   ./scripts/build-for-deploy.sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$REPO_ROOT/texttoeat-app"
SAIL_BIN="$APP_DIR/vendor/bin/sail"

sail() {
  (cd "$APP_DIR" && if [[ -x "$SAIL_BIN" ]]; then "$SAIL_BIN" "$@"; else sh "$SAIL_BIN" "$@"; fi)
}

if ! command -v docker &>/dev/null; then
  echo "Error: Docker is not installed or not in PATH. Install Docker and try again."
  exit 1
fi

if [[ ! -d "$APP_DIR" ]] || [[ ! -f "$APP_DIR/composer.json" ]]; then
  echo "Error: Laravel app not found. Expected composer.json at:"
  echo "  $APP_DIR/composer.json"
  exit 1
fi

echo "Building in $APP_DIR..."

# Safety: these files are dev-only and must never be deployed.
if [[ -f "$APP_DIR/public/hot" ]]; then
  echo "Note: Found public/hot (Vite dev server marker). It will be excluded from the deploy folder."
fi
if [[ -L "$APP_DIR/public/storage" ]]; then
  echo "Note: Found public/storage symlink. It will be excluded from the deploy folder."
fi

# Full vendor (including require-dev) so Sail exists and local tests keep working.
if [[ ! -f "$APP_DIR/vendor/autoload.php" ]]; then
  echo "No vendor/autoload.php — bootstrapping Composer dependencies (with dev) via Docker..."
  docker run --rm \
    -v "$APP_DIR:/app" \
    -w /app \
    composer:latest \
    install --no-interaction --prefer-dist
fi

use_sail=false
if [[ -f "$SAIL_BIN" ]]; then
  use_sail=true
fi

if [[ "$use_sail" == true ]]; then
  echo "Using Laravel Sail for frontend build."
  echo "Starting Sail (docker compose) — first run may build images..."
  sail up -d

  ENV_FILE="$APP_DIR/.env.prod"
  if [[ -f "$ENV_FILE" ]]; then
    echo "Using $ENV_FILE for Vite (Sail exec)..."
    sail exec laravel.test bash -lc 'set -a && [ -f .env.prod ] && . ./.env.prod; set +a && npm ci && npm run build'
  else
    echo "No .env.prod found; Sail npm build without extra env. For VITE_*, add .env.prod."
    sail npm ci
    sail npm run build
  fi
else
  echo "Sail not found at $SAIL_BIN — using Composer + Node containers on the app tree."
  echo "Running composer install --no-dev (this removes dev packages including Sail from texttoeat-app)..."
  docker run --rm \
    -v "$APP_DIR:/app" \
    -w /app \
    composer:latest \
    install --no-dev --optimize-autoloader --no-interaction --prefer-dist

  ENV_FILE="$APP_DIR/.env.prod"
  if [[ -f "$ENV_FILE" ]]; then
    echo "Using $ENV_FILE for build-time env (e.g. VITE_*)..."
    docker run --rm \
      -v "$APP_DIR:/app" \
      -w /app \
      --env-file "$ENV_FILE" \
      node:20 \
      sh -c "npm ci && npm run build"
  else
    echo "No .env.prod found; running npm build without extra env."
    docker run --rm \
      -v "$APP_DIR:/app" \
      -w /app \
      node:20 \
      sh -c "npm ci && npm run build"
  fi
fi

echo ""
echo "Creating deploy folder..."
DEPLOY_PARENT="$REPO_ROOT/deploy-builds"
mkdir -p "$DEPLOY_PARENT"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEPLOY_DIR="$DEPLOY_PARENT/texttoeat-app-deploy-$STAMP"
mkdir -p "$DEPLOY_DIR"

# Copy app into deploy folder, excluding secrets and dev-only artifacts.
if command -v rsync &>/dev/null; then
  rsync -a --delete \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude '.git' \
    --exclude '.git/**' \
    --exclude 'node_modules' \
    --exclude 'node_modules/**' \
    --exclude '*.log' \
    --exclude '.phpunit.result.cache' \
    --exclude 'public/hot' \
    --exclude 'public/storage' \
    --exclude 'public/storage/**' \
    "$APP_DIR/" "$DEPLOY_DIR/"
else
  echo "Note: rsync not found; using tar (install rsync for faster incremental copies)."
  (cd "$APP_DIR" && tar cf - \
    --exclude='./.env' \
    --exclude='./.env.*' \
    --exclude='./.git' \
    --exclude='./node_modules' \
    --exclude='./*.log' \
    --exclude='./.phpunit.result.cache' \
    --exclude='./public/hot' \
    --exclude='./public/storage' \
    .) | (cd "$DEPLOY_DIR" && tar xf -)
fi

echo "Production composer on deploy copy only..."
docker run --rm \
  -v "$DEPLOY_DIR:/app" \
  -w /app \
  composer:latest \
  install --no-dev --optimize-autoloader --no-interaction --prefer-dist

echo ""
echo "Deploy folder created at:"
echo "  $DEPLOY_DIR"
echo ""
echo "Build complete. Upload the deploy folder contents via FTP (e.g. FileZilla)."
echo "Included: vendor/, public/build/, app-root .htaccess, php-run-scripts/. Excluded: .env, .env.*, .git, node_modules, public/hot, public/storage."
echo "See docs/DEPLOY_BEGINNER_GUIDE.md for steps. Create .env on the server after upload."
