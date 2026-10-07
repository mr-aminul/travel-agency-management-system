#!/usr/bin/env bash
# Deploy OneTrack platform to the inventivelab VPS as an isolated stack.
# Uses VPS_* from .env (password SSH). Does not touch n8n/MinIO/Cloudreve.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

read_env() {
  local key="$1"
  local file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

ENV_FILE="$ROOT/.env"
HOST="$(read_env VPS_HOST "$ENV_FILE")"
USER_NAME="$(read_env VPS_USER "$ENV_FILE")"
PASS="$(read_env VPS_PASSWORD "$ENV_FILE")"
PUBLIC_URL="${PLATFORM_PUBLIC_URL:-https://tams.inventivelab.bd}"
REMOTE_ROOT="${PLATFORM_REMOTE_ROOT:-/opt/onetrack-platform}"
REMOTE_WEB="${PLATFORM_REMOTE_WEB:-/var/www/onetrack-platform}"
DB_PASSWORD_FILE="$REMOTE_ROOT/.env"

if [[ -z "$HOST" || -z "$USER_NAME" || -z "$PASS" ]]; then
  echo "VPS_HOST / VPS_USER / VPS_PASSWORD missing in .env" >&2
  exit 1
fi

if ! command -v sshpass >/dev/null; then
  echo "sshpass is required for password SSH" >&2
  exit 1
fi

TARGET="${USER_NAME}@${HOST}"
SSH=(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no "$TARGET")
RSYNC=(sshpass -p "$PASS" rsync -az -e "ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no")

echo "[platform] Building SPA (base=/) …"
if [[ ! -d node_modules ]]; then
  npm ci
fi
VITE_BASE_PATH=/ VITE_USE_PLATFORM_API=1 npm run build
if [[ ! -f dist/index.html ]]; then
  echo "Build failed: dist/index.html missing" >&2
  exit 1
fi

echo "[platform] Ensuring remote dirs …"
"${SSH[@]}" "mkdir -p '$REMOTE_ROOT/server' '$REMOTE_ROOT/db' '$REMOTE_ROOT/deploy' '$REMOTE_WEB' /etc/caddy/conf.d"

echo "[platform] Uploading app sources + dist …"
"${RSYNC[@]}" \
  --exclude node_modules \
  "$ROOT/server/" "$TARGET:$REMOTE_ROOT/server/"
"${RSYNC[@]}" "$ROOT/db/" "$TARGET:$REMOTE_ROOT/db/"
"${RSYNC[@]}" "$ROOT/deploy/" "$TARGET:$REMOTE_ROOT/deploy/"
"${RSYNC[@]}" --delete "$ROOT/dist/" "$TARGET:$REMOTE_WEB/"

echo "[platform] Configuring isolated DB password + compose …"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
REMOTE_ROOT='$REMOTE_ROOT'
REMOTE_WEB='$REMOTE_WEB'
DB_PASSWORD_FILE='$DB_PASSWORD_FILE'
PUBLIC_URL='$PUBLIC_URL'

if [[ ! -f "\$DB_PASSWORD_FILE" ]]; then
  PW=\$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-28)
  cat > "\$DB_PASSWORD_FILE" <<EOF
PLATFORM_DB_PASSWORD=\$PW
PLATFORM_CORS_ORIGIN=\$PUBLIC_URL
EOF
  chmod 600 "\$DB_PASSWORD_FILE"
  echo "[platform] wrote new \$DB_PASSWORD_FILE"
else
  echo "[platform] keeping existing \$DB_PASSWORD_FILE"
fi

# Static ownership for Caddy
chown -R root:www-data "\$REMOTE_WEB" 2>/dev/null || chown -R root:root "\$REMOTE_WEB"
find "\$REMOTE_WEB" -type d -exec chmod 755 {} \\;
find "\$REMOTE_WEB" -type f -exec chmod 644 {} \\;

# Caddy site snippet (idempotent)
cp "\$REMOTE_ROOT/deploy/Caddyfile.snippet" /etc/caddy/conf.d/onetrack-platform.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

# Docker stack (isolated network/volumes)
cd "\$REMOTE_ROOT/deploy"
docker compose --env-file "\$DB_PASSWORD_FILE" -f docker-compose.yml up -d --build

sleep 3
curl -fsS "http://127.0.0.1:4010/api/platform/health" | head -c 200
echo
REMOTE

echo "[platform] Public checks …"
curl -fsS -o /dev/null -w "  SPA  %{http_code}\n" "$PUBLIC_URL/"
curl -fsS -w "  API  %{http_code} %{url_effective}\n" "$PUBLIC_URL/api/platform/health" || true
echo "[platform] Live → $PUBLIC_URL/"
