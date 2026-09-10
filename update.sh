#!/usr/bin/env bash
# =============================================================================
# update.sh — Update an already-deployed client POS system.
#
# Run from inside the app directory: $HOME/systems/$SLUG
#   bash update.sh
#
# 100% generic — never edit this file per client. All per-client values come
# from ./deploy.config. Preserves APP_KEY, DB credentials, .env, and data.
# =============================================================================
set -e

# ── PHP binary ────────────────────────────────────────────────────────────────
# If the default 'php' resolves to the wrong version on this box, hardcode the
# correct EA-PHP binary here, e.g. PHP_BIN="/usr/local/bin/ea-php82"
PHP_BIN=$(command -v php8.2 2>/dev/null || command -v php8.1 2>/dev/null || command -v php 2>/dev/null)
echo "==> PHP binary: $PHP_BIN ($($PHP_BIN -r 'echo PHP_VERSION;'))"

# ── 1. Load per-client config ─────────────────────────────────────────────────
if [ ! -f "./deploy.config" ]; then
    echo "!! deploy.config not found. This system was not set up with deploy.sh, or you're in the wrong directory."
    exit 1
fi
source ./deploy.config

SLUG="${SUBDOMAIN%%.*}"
APP_DIR="$(pwd)"
DOCROOT="$HOME/public_html/$SLUG"
APP_URL="https://$SUBDOMAIN"

echo "==> SLUG=$SLUG"
echo "==> APP_DIR=$APP_DIR"

# ── 2. Pull latest code for this branch only ──────────────────────────────────
OWNER_REPO="$(echo "$REPO" | sed -E 's#https://github.com/##; s#\.git$##')"
echo "==> Fetching latest $BRANCH for $OWNER_REPO ..."
git remote set-url origin "https://${GH_TOKEN}@github.com/${OWNER_REPO}.git"
git fetch origin
git reset --hard "origin/$BRANCH"
# NOTE: reset --hard only touches tracked files; gitignored files like .env
# and deploy.config are left untouched.

# ── 3. Install PHP dependencies ────────────────────────────────────────────────
echo "==> Running composer install ..."
$PHP_BIN "$HOME/composer.phar" install \
    --no-dev \
    --optimize-autoloader \
    --ignore-platform-req=ext-fileinfo \
    --no-interaction \
    --working-dir="$APP_DIR"

# .env, APP_KEY, and seeders are intentionally NOT touched here.

# ── 4. Re-wire the document root (idempotent) ─────────────────────────────────
echo "==> Re-wiring document root ..."
mkdir -p "$DOCROOT"
printf "<?php require '%s/public/index.php';\n" "$APP_DIR" > "$DOCROOT/index.php"
cp "$APP_DIR/public/.htaccess" "$DOCROOT/.htaccess"

[ -L "$DOCROOT/build" ] && rm "$DOCROOT/build"
[ -d "$DOCROOT/build" ] && rm -rf "$DOCROOT/build"
ln -sfn "$APP_DIR/public/build" "$DOCROOT/build"

[ -L "$DOCROOT/storage" ] && rm "$DOCROOT/storage"
[ -d "$DOCROOT/storage" ] && rm -rf "$DOCROOT/storage"
ln -sfn "$APP_DIR/storage/app/public" "$DOCROOT/storage"

# NOTE: symlink any other real public/ asset dirs the app uses here, e.g.:
# ln -sfn "$APP_DIR/public/images" "$DOCROOT/images"

# ── 5. Apply new migrations ────────────────────────────────────────────────────
echo "==> Running migrations ..."
$PHP_BIN "$APP_DIR/artisan" migrate --force

# ── 6. Clear and warm caches (never config:cache) ─────────────────────────────
echo "==> Clearing and warming caches ..."
$PHP_BIN "$APP_DIR/artisan" optimize:clear
$PHP_BIN "$APP_DIR/artisan" route:cache
$PHP_BIN "$APP_DIR/artisan" view:cache
# NOTE: config:cache is intentionally never run (breaks APP_KEY on shared hosting).

echo ""
echo "Update complete for $APP_URL"
