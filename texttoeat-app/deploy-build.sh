#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-build.sh
#
# Builds the app for production and assembles a clean copy in .build/
# ready to upload to shared hosting via FTP (lftp or FileZilla).
#
# Usage (from project root, Git Bash):
#   bash deploy-build.sh
#
# Output: .build/  (gitignored)
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$ROOT/.build"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          TextToEat — Deploy Build        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Clean output directory ─────────────────────────────────────────────
echo "==> [1/4] Cleaning .build/ ..."
rm -rf "$OUT"
mkdir -p "$OUT"

# ── 2. Build frontend assets ──────────────────────────────────────────────
# Use production env (Pusher) so Vite bakes in the correct broadcaster, not local Reverb.
echo "==> [2/4] Building frontend with Pusher config ..."
cd "$ROOT"
set -a && source .env.hosting.prod.example && set +a
npm run build

# ── 3. Copy production files (allowlist) ─────────────────────────────────
echo "==> [3/4] Copying production files to .build/ ..."

# PHP source + config
cp -r app bootstrap config database lang routes "$OUT/"

# Artisan + composer manifests (vendor rebuilt below without dev deps)
cp artisan composer.json composer.lock "$OUT/"

# Public (includes compiled assets from npm run build)
cp -r public "$OUT/"
# Remove dev-mode flag — its presence would make Laravel load from localhost:5173
rm -f "$OUT/public/hot"

# Only the views from resources — JS/CSS source files are not needed in prod
mkdir -p "$OUT/resources"
cp -r resources/views "$OUT/resources/"
[ -d resources/css ] && cp -r resources/css "$OUT/resources/"

# Helper scripts for post-deploy (migrations, cache rebuild)
cp -r php-run-scripts "$OUT/"

# .htaccess if present at root
[ -f .htaccess ] && cp .htaccess "$OUT/"

# Env example as a reference (not the actual .env)
[ -f env.production.example ] && cp env.production.example "$OUT/"

# ── 4. Production vendor — no dev dependencies ────────────────────────────
echo "==> [4/4] Installing production-only composer dependencies ..."
cd "$OUT"
composer install --no-dev --optimize-autoloader --no-interaction --quiet

# Remove stale bootstrap cache — server must regenerate via deploy-update.php
# (prevents dev-only service providers like Pail from being loaded)
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php

# ── 5. Create required empty storage directories ──────────────────────────
echo "==> Creating storage directory structure ..."
mkdir -p storage/logs
mkdir -p storage/app/public
mkdir -p storage/framework/cache/data
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
touch storage/logs/.gitkeep
touch storage/framework/cache/data/.gitkeep
touch storage/framework/sessions/.gitkeep
touch storage/framework/views/.gitkeep

# ── Done ──────────────────────────────────────────────────────────────────
cd "$ROOT"
echo ""
echo "✓  Build complete!"
echo "   Output folder : .build/"
echo "   Size          : $(du -sh "$OUT" 2>/dev/null | cut -f1)"
echo ""
echo "   Upload via FTP the contents of .build/ to your hosting root."
echo "   After uploading, run on the server:"
echo "     php php-run-scripts/deploy-update.php"
echo ""
