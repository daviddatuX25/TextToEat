#!/usr/bin/env bash
# Build texttoeat-app for manual deploy (composer + npm) using Docker.
# Run from repo root. Optional: copy .env.prod.example to .env.prod and fill
# VITE_* (and other vars) so the frontend build gets the right values.
#
# The built app (and --zip) includes: vendor/, public/build/, app-root .htaccess
# (denies all web access to app root), and php-run-scripts/. Excludes .env and
# .env.* so no secrets are bundled. Create .env on the server after upload.
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

# Safety: these files are dev-only and must never be deployed.
if [[ -f "$APP_DIR/public/hot" ]]; then
  echo "Note: Found public/hot (Vite dev server marker). It will be excluded from the deploy zip."
fi
if [[ -L "$APP_DIR/public/storage" ]]; then
  echo "Note: Found public/storage symlink. It will be excluded from the deploy zip."
fi

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
  ZIP_OUT="$REPO_ROOT/texttoeat-app-deploy.zip"
  if command -v zip &>/dev/null; then
    (cd "$APP_DIR" && zip -r "$ZIP_OUT" . \
      -x ".env" ".env.*" ".git/*" "node_modules/*" "*.log" ".phpunit.result.cache" \
         "public/hot" "public/storage" "public/storage/*" 2>/dev/null || true)
  else
    (cd "$APP_DIR" && python3 - "$ZIP_OUT" << 'PY' || true
import zipfile, os, sys
out = sys.argv[1]
exclude_dirs = {'.git', 'node_modules'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            path = os.path.join(root, f)
            if path == './public/hot' or path.startswith('./public/storage/'): continue
            if '.git' in path or 'node_modules' in path or path.endswith('.log'): continue
            if path.startswith('./.env') and 'env.prod.example' not in path and 'env.production' not in path and 'env.dev.example' not in path: continue
            full = os.path.join(root, f)
            if not os.path.exists(full) or os.path.islink(full): continue
            z.write(full, path)
PY
    )
  fi
  [[ -f "$ZIP_OUT" ]] && echo "Created $ZIP_OUT. Upload and extract on the server if your panel allows." || echo "Warning: zip creation failed (install 'zip' or ensure python3 is available)."
fi

echo ""
echo "Build complete. Upload texttoeat-app/ (or the zip) via FileZilla."
echo "Included: vendor/, public/build/, app-root .htaccess, php-run-scripts/. Excluded: .env, .env.*, .git, node_modules, public/hot, public/storage."
echo "See docs/DEPLOY_BEGINNER_GUIDE.md for steps. Create .env on the server after upload."
