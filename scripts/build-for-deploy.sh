#!/usr/bin/env bash
# Build texttoeat-app for manual deploy (composer + npm) using Docker.
# Run from repo root. Optional: copy .env.prod.example to .env.prod and fill
# VITE_* (and other vars) so the frontend build gets the right values.
# Usage: ./scripts/build-for-deploy.sh [--zip]
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$REPO_ROOT/texttoeat-app"
DO_ZIP=false
for arg in "$@"; do
  [[ "$arg" == "--zip" ]] && DO_ZIP=true
done

if ! command -v docker &>/dev/null; then
  echo "Error: Docker is not installed or not in PATH. Install Docker and try again."
  exit 1
fi

echo "Building in $APP_DIR (composer + npm via Docker)..."

# 1. Composer install (production, no dev)
echo "Running composer install..."
docker run --rm \
  -v "$APP_DIR:/app" \
  -w /app \
  composer:latest \
  install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# 2. npm ci and npm run build (with .env.prod for Vite if present)
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
  echo "No .env.prod found; running npm build without extra env. For Pusher/Vite, copy .env.prod.example to .env.prod and set VITE_* then re-run."
  docker run --rm \
    -v "$APP_DIR:/app" \
    -w /app \
    node:20 \
    sh -c "npm ci && npm run build"
fi

if [[ "$DO_ZIP" == true ]]; then
  echo "Creating deploy zip..."
  (cd "$APP_DIR" && zip -r "$REPO_ROOT/texttoeat-app-deploy.zip" . \
    -x ".env" ".env.*" ".git/*" "node_modules/*" "*.log" ".phpunit.result.cache" 2>/dev/null || true)
  echo "Created $REPO_ROOT/texttoeat-app-deploy.zip. Upload and extract on the server if your panel allows."
fi

echo ""
echo "Build complete. Upload the contents of texttoeat-app/ (excluding .env, .git, node_modules) via FileZilla."
echo "Include vendor/ and public/build/. See docs/DEPLOY_BEGINNER_GUIDE.md for steps."
