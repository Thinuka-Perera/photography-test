#!/usr/bin/env bash
# =============================================================================
# deploy.sh — FIRST-TIME setup of a client POS system on shared cPanel hosting.
#
# Run from inside the freshly-cloned app directory: $HOME/systems/$SLUG
#   cp deploy.config.example deploy.config   (edit the 7 values)
#   bash deploy.sh
#
# 100% generic — never edit this file per client. All per-client values come
# from ./deploy.config. Safe to re-run if a step fails partway through.
# =============================================================================
set -e

# ── PHP binary ────────────────────────────────────────────────────────────────
# If the default 'php' resolves to the wrong version on this box, hardcode the
# correct EA-PHP binary here, e.g. PHP_BIN="/usr/local/bin/ea-php82"
PHP_BIN=$(command -v php8.2 2>/dev/null || command -v php8.1 2>/dev/null || command -v php 2>/dev/null)
echo "==> PHP binary: $PHP_BIN ($($PHP_BIN -r 'echo PHP_VERSION;'))"

# ── 1. Load per-client config ─────────────────────────────────────────────────
if [ ! -f "./deploy.config" ]; then
    echo "!! deploy.config not found. Copy deploy.config.example to deploy.config and edit it first."
    exit 1
fi
source ./deploy.config

SLUG="${SUBDOMAIN%%.*}"
APP_DIR="$(pwd)"
DOCROOT="$HOME/public_html/$SLUG"
APP_URL="https://$SUBDOMAIN"

echo "==> SLUG=$SLUG"
echo "==> APP_DIR=$APP_DIR"
echo "==> DOCROOT=$DOCROOT"
echo "==> APP_URL=$APP_URL"

# ── 2. Install Composer once, shared by all clients ──────────────────────────
if [ ! -f "$HOME/composer.phar" ]; then
    echo "==> Installing shared Composer to $HOME/composer.phar ..."
    $PHP_BIN -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    $PHP_BIN composer-setup.php --install-dir="$HOME" --filename=composer.phar
    rm -f composer-setup.php
else
    echo "==> Shared Composer already present at $HOME/composer.phar"
fi

# ── 3. Ensure the subdomain exists (idempotent) ───────────────────────────────
echo "==> Ensuring subdomain $SUBDOMAIN exists ..."
if command -v uapi >/dev/null 2>&1; then
    uapi SubDomain addsubdomain domain="$SLUG" rootdomain="pos2.possystem.lk" dir="public_html/$SLUG" \
        || echo "==> (ignoring error — subdomain likely already exists)"
else
    echo "!! 'uapi' is not available on this system."
    echo "!! Please create the subdomain manually in the cPanel UI:"
    echo "!!   Subdomain: $SLUG   Domain: pos2.possystem.lk   Document Root: public_html/$SLUG"
fi
mkdir -p "$DOCROOT"

# ── 4. Install PHP dependencies ────────────────────────────────────────────────
echo "==> Running composer install ..."
$PHP_BIN "$HOME/composer.phar" install \
    --no-dev \
    --optimize-autoloader \
    --ignore-platform-req=ext-fileinfo \
    --no-interaction \
    --working-dir="$APP_DIR"

# ── 5. Build .env ──────────────────────────────────────────────────────────────
echo "==> Configuring .env ..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi
# Fix Windows CRLF line endings
sed -i 's/\r$//' "$APP_DIR/.env"

set_env() {
    local key="$1" val="$2"
    if grep -q "^${key}=" "$APP_DIR/.env"; then
        sed -i "s|^${key}=.*|${key}=${val}|" "$APP_DIR/.env"
    else
        echo "${key}=${val}" >> "$APP_DIR/.env"
    fi
}

set_env "APP_ENV" "production"
set_env "APP_DEBUG" "false"
set_env "APP_URL" "$APP_URL"
set_env "DB_DATABASE" "$DB_NAME"
set_env "DB_USERNAME" "$DB_USER"
set_env "DB_PASSWORD" "$DB_PASS"

CURRENT_KEY=$(grep "^APP_KEY=" "$APP_DIR/.env" | cut -d '=' -f2-)
if [ -z "$CURRENT_KEY" ]; then
    echo "==> APP_KEY is empty — generating a new one ..."
    $PHP_BIN "$APP_DIR/artisan" key:generate --force
else
    echo "==> APP_KEY already set — leaving it untouched."
fi

# ── 6. Wire the subdomain document root to the app ───────────────────────────
echo "==> Wiring document root ..."
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

# ── 7. Permissions ─────────────────────────────────────────────────────────────
echo "==> Setting permissions ..."
find "$APP_DIR" -type d -exec chmod 755 {} \;
find "$APP_DIR" -type f -exec chmod 644 {} \;
chmod -R 775 "$APP_DIR/storage" "$APP_DIR/bootstrap/cache"
chmod 755 "$APP_DIR/artisan"

# ── 8. Migrate, and seed only on the very first deploy ────────────────────────
echo "==> Running migrations ..."
$PHP_BIN "$APP_DIR/artisan" migrate --force

if [ ! -f "$APP_DIR/storage/.seeded" ]; then
    echo "==> First deploy detected — running seeders ..."
    $PHP_BIN "$APP_DIR/artisan" db:seed --force
    touch "$APP_DIR/storage/.seeded"
else
    echo "==> storage/.seeded present — skipping seeders."
fi

# ── 9. Clear and warm caches (never config:cache) ─────────────────────────────
echo "==> Clearing and warming caches ..."
$PHP_BIN "$APP_DIR/artisan" optimize:clear
$PHP_BIN "$APP_DIR/artisan" route:cache
$PHP_BIN "$APP_DIR/artisan" view:cache
# NOTE: config:cache is intentionally never run (breaks APP_KEY on shared hosting).

echo ""
echo "Deployment complete!"
echo "  Site: $APP_URL"
echo ""
echo "Reminder: confirm SSL covers $SUBDOMAIN (AutoSSL, or a wildcard cert for *.pos2.possystem.lk)."
