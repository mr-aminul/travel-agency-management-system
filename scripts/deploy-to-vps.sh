#!/usr/bin/env bash
# Deploy OneTrack UI + API + Postgres to the inventivelab VPS.
# Does not touch n8n / MinIO / Cloudreve.
#
# Credentials: env vars win over .env (so GitHub Actions can inject secrets).
# UI releases: uploaded to web-releases/<sha>, then symlink web/ flipped after health checks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

read_env() {
  local key="$1"
  local file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

# Prefer process env (CI); fall back to local .env.
env_or_file() {
  local key="$1"
  local from_env="${!key-}"
  if [[ -n "$from_env" ]]; then
    printf '%s' "$from_env"
    return
  fi
  if [[ -f "$ENV_FILE" ]]; then
    read_env "$key" "$ENV_FILE"
  fi
}

ENV_FILE="$ROOT/.env"
HOST="$(env_or_file VPS_HOST)"
USER_NAME="$(env_or_file VPS_USER)"
PASS="$(env_or_file VPS_PASSWORD)"
PUBLIC_UI_URL="$(env_or_file PLATFORM_PUBLIC_UI_URL)"
PUBLIC_UI_URL="${PUBLIC_UI_URL:-https://onetrack.inventivelab.bd}"
PUBLIC_API_URL="${PLATFORM_PUBLIC_API_URL:-https://api.onetrack.inventivelab.bd}"
# Include local Vite origins so localhost can call the live API directly if needed.
CORS_ORIGIN="${PLATFORM_CORS_ORIGIN:-https://onetrack.inventivelab.bd,http://localhost:8003,http://127.0.0.1:8003}"
REMOTE_ROOT="${PLATFORM_REMOTE_ROOT:-/opt/onetrack-platform}"
REMOTE_WEB_DIR="$REMOTE_ROOT/web"
REMOTE_RELEASES_DIR="$REMOTE_ROOT/web-releases"
KEEP_RELEASES="${PLATFORM_KEEP_RELEASES:-5}"
DB_PASSWORD_FILE="$REMOTE_ROOT/.env"
ADMIN_EMAIL="$(env_or_file PLATFORM_ADMIN_EMAIL)"
ADMIN_PASSWORD="$(env_or_file PLATFORM_ADMIN_PASSWORD)"
AGENCY_PASSWORD="$(env_or_file SEED_AGENCY_PASSWORD)"
SEED_FORCE="$(env_or_file SEED_FORCE_PASSWORDS)"
SMTP_HOST="$(env_or_file SMTP_HOST)"
SMTP_PORT="$(env_or_file SMTP_PORT)"
SMTP_SECURE="$(env_or_file SMTP_SECURE)"
SMTP_USER="$(env_or_file SMTP_USER)"
SMTP_PASSWORD="$(env_or_file SMTP_PASSWORD)"
SMTP_FROM="$(env_or_file SMTP_FROM)"
ADMIN_EMAIL="${ADMIN_EMAIL:-aminulislamborhan@gmail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-12345}"
AGENCY_PASSWORD="${AGENCY_PASSWORD:-12345}"
SEED_FORCE="${SEED_FORCE:-0}"
SMTP_HOST="${SMTP_HOST:-mail.inventivelab.bd}"
SMTP_PORT="${SMTP_PORT:-465}"
SMTP_SECURE="${SMTP_SECURE:-1}"
SMTP_FROM="${SMTP_FROM:-OneTrack <noreply@inventivelab.bd>}"

RELEASE_SHA="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo manual)}"
RELEASE_SHA="${RELEASE_SHA:0:12}"
REMOTE_RELEASE_DIR="$REMOTE_RELEASES_DIR/$RELEASE_SHA"

if [[ -z "$HOST" || -z "$USER_NAME" || -z "$PASS" ]]; then
  echo "VPS_HOST / VPS_USER / VPS_PASSWORD missing (env or .env)" >&2
  exit 1
fi

if [[ -z "$SMTP_USER" || -z "$SMTP_PASSWORD" ]]; then
  echo "SMTP_USER / SMTP_PASSWORD missing (env or .env; required for password-reset email)" >&2
  exit 1
fi

if ! command -v sshpass >/dev/null; then
  echo "sshpass is required for password SSH" >&2
  exit 1
fi

TARGET="${USER_NAME}@${HOST}"
SSH=(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no "$TARGET")
RSYNC=(sshpass -p "$PASS" rsync -az -e "ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no")

echo "[platform-ui] Building SPA …"
if [[ ! -d node_modules ]]; then
  npm ci
fi
VITE_USE_PLATFORM_API=1 \
  VITE_API_BASE_URL="$PUBLIC_API_URL" \
  npm run build

if [[ ! -f dist/index.html ]]; then
  echo "Build failed: dist/index.html missing" >&2
  exit 1
fi

echo "[platform] Ensuring remote dirs …"
"${SSH[@]}" "mkdir -p '$REMOTE_ROOT/server' '$REMOTE_ROOT/db' '$REMOTE_ROOT/deploy' '$REMOTE_RELEASES_DIR' /etc/caddy/conf.d"

# If web/ is a real directory from older deploys, move it to a release once.
"${SSH[@]}" bash -s <<MIGRATE
set -euo pipefail
REMOTE_ROOT='$REMOTE_ROOT'
REMOTE_WEB_DIR='$REMOTE_WEB_DIR'
REMOTE_RELEASES_DIR='$REMOTE_RELEASES_DIR'
if [[ -d "\$REMOTE_WEB_DIR" && ! -L "\$REMOTE_WEB_DIR" ]]; then
  LEGACY="\$REMOTE_RELEASES_DIR/legacy-\$(date +%Y%m%d%H%M%S)"
  mv "\$REMOTE_WEB_DIR" "\$LEGACY"
  ln -sfn "\$LEGACY" "\$REMOTE_WEB_DIR"
  echo "[platform-ui] migrated existing web/ → \$LEGACY"
fi
MIGRATE

echo "[platform-ui] Staging release $RELEASE_SHA → $REMOTE_RELEASE_DIR/"
"${SSH[@]}" "mkdir -p '$REMOTE_RELEASE_DIR'"
"${RSYNC[@]}" --delete "$ROOT/dist/" "$TARGET:$REMOTE_RELEASE_DIR/"

echo "[platform-api] Uploading API sources …"
"${RSYNC[@]}" --exclude node_modules "$ROOT/server/" "$TARGET:$REMOTE_ROOT/server/"
"${RSYNC[@]}" "$ROOT/db/" "$TARGET:$REMOTE_ROOT/db/"
"${RSYNC[@]}" "$ROOT/deploy/" "$TARGET:$REMOTE_ROOT/deploy/"

echo "[platform] Configuring isolated DB + Caddy …"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
REMOTE_ROOT='$REMOTE_ROOT'
DB_PASSWORD_FILE='$DB_PASSWORD_FILE'
CORS_ORIGIN='$CORS_ORIGIN'
ADMIN_EMAIL='$ADMIN_EMAIL'
ADMIN_PASSWORD='$ADMIN_PASSWORD'
AGENCY_PASSWORD='$AGENCY_PASSWORD'
SEED_FORCE='$SEED_FORCE'
PUBLIC_UI_URL='$PUBLIC_UI_URL'
SMTP_HOST='$SMTP_HOST'
SMTP_PORT='$SMTP_PORT'
SMTP_SECURE='$SMTP_SECURE'
SMTP_USER='$SMTP_USER'
SMTP_PASSWORD='$SMTP_PASSWORD'
SMTP_FROM='$SMTP_FROM'
REMOTE_WEB_DIR='$REMOTE_WEB_DIR'
REMOTE_RELEASE_DIR='$REMOTE_RELEASE_DIR'
REMOTE_RELEASES_DIR='$REMOTE_RELEASES_DIR'
KEEP_RELEASES='$KEEP_RELEASES'

set_kv() {
  local k="\$1" v="\$2"
  if grep -q "^\$k=" "\$DB_PASSWORD_FILE"; then
    sed -i "s|^\$k=.*|\$k=\$v|" "\$DB_PASSWORD_FILE"
  else
    echo "\$k=\$v" >> "\$DB_PASSWORD_FILE"
  fi
}

if [[ ! -f "\$DB_PASSWORD_FILE" ]]; then
  PW=\$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-28)
  cat > "\$DB_PASSWORD_FILE" <<EOF
PLATFORM_DB_PASSWORD=\$PW
PLATFORM_CORS_ORIGIN=\$CORS_ORIGIN
PLATFORM_ADMIN_EMAIL=\$ADMIN_EMAIL
PLATFORM_ADMIN_PASSWORD=\$ADMIN_PASSWORD
SEED_AGENCY_PASSWORD=\$AGENCY_PASSWORD
SEED_FORCE_PASSWORDS=\$SEED_FORCE
PLATFORM_PUBLIC_UI_URL=\$PUBLIC_UI_URL
SMTP_HOST=\$SMTP_HOST
SMTP_PORT=\$SMTP_PORT
SMTP_SECURE=\$SMTP_SECURE
SMTP_USER=\$SMTP_USER
SMTP_PASSWORD=\$SMTP_PASSWORD
SMTP_FROM=\$SMTP_FROM
EOF
  chmod 600 "\$DB_PASSWORD_FILE"
  echo "[platform-api] wrote new \$DB_PASSWORD_FILE"
else
  set_kv PLATFORM_CORS_ORIGIN "\$CORS_ORIGIN"
  set_kv PLATFORM_ADMIN_EMAIL "\$ADMIN_EMAIL"
  set_kv PLATFORM_ADMIN_PASSWORD "\$ADMIN_PASSWORD"
  set_kv SEED_AGENCY_PASSWORD "\$AGENCY_PASSWORD"
  set_kv SEED_FORCE_PASSWORDS "\$SEED_FORCE"
  set_kv PLATFORM_PUBLIC_UI_URL "\$PUBLIC_UI_URL"
  set_kv SMTP_HOST "\$SMTP_HOST"
  set_kv SMTP_PORT "\$SMTP_PORT"
  set_kv SMTP_SECURE "\$SMTP_SECURE"
  set_kv SMTP_USER "\$SMTP_USER"
  set_kv SMTP_PASSWORD "\$SMTP_PASSWORD"
  set_kv SMTP_FROM "\$SMTP_FROM"
  echo "[platform-api] updated auth + SMTP + CORS on \$DB_PASSWORD_FILE"
fi

cp "\$REMOTE_ROOT/deploy/Caddyfile.api.snippet" /etc/caddy/conf.d/onetrack-platform-api.caddy
cp "\$REMOTE_ROOT/deploy/Caddyfile.ui.snippet" /etc/caddy/conf.d/onetrack-platform-ui.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

cd "\$REMOTE_ROOT/deploy"
docker compose --env-file "\$DB_PASSWORD_FILE" -f docker-compose.yml up -d --build

sleep 3
curl -fsS "http://127.0.0.1:4010/api/platform/health"
echo

# API healthy → flip UI symlink (broken builds never become live)
ln -sfn "\$REMOTE_RELEASE_DIR" "\$REMOTE_WEB_DIR"
echo "[platform-ui] live → \$REMOTE_RELEASE_DIR"

# Prune old releases (keep newest KEEP_RELEASES)
cd "\$REMOTE_RELEASES_DIR"
ls -1dt */ 2>/dev/null | tail -n +"\$((KEEP_RELEASES + 1))" | while read -r old; do
  rm -rf "\$old"
  echo "[platform-ui] pruned \$old"
done
REMOTE

echo "[platform] Public checks …"
API_HEADERS="$(curl -fsSI "$PUBLIC_API_URL/api/platform/health")"
echo "$API_HEADERS" | tr -d '\r' | grep -qi '^x-app: onetrack-platform-api' || {
  echo "API check failed — expected X-App: onetrack-platform-api from Caddy" >&2
  echo "$API_HEADERS" >&2
  exit 1
}
echo "  API 200 (Caddy)"

UI_HEADERS="$(curl -fsSI "$PUBLIC_UI_URL/")"
if echo "$UI_HEADERS" | tr -d '\r' | grep -qi '^server: vercel'; then
  echo "UI still resolving to Vercel, not this VPS." >&2
  echo "Point DNS for onetrack.inventivelab.bd (A → VPS, same IP as api.onetrack) and remove the Vercel CNAME." >&2
  echo "Until then the public URL will keep serving the old Vercel deploy." >&2
  exit 1
fi
echo "$UI_HEADERS" | tr -d '\r' | grep -qi '^x-app: onetrack-platform-ui' || {
  echo "UI check failed — expected X-App: onetrack-platform-ui from Caddy" >&2
  echo "$UI_HEADERS" >&2
  exit 1
}
echo "  UI  200 (Caddy)"
echo "[platform-ui] Live → $PUBLIC_UI_URL (release $RELEASE_SHA)"
echo "[platform-api] Live → $PUBLIC_API_URL"
