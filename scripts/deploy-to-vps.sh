#!/usr/bin/env bash
# Deploy OneTrack UI + API + Postgres to the inventivelab VPS.
# Does not touch n8n / MinIO / Cloudreve.
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
PUBLIC_UI_URL="${PLATFORM_PUBLIC_UI_URL:-https://onetrack.inventivelab.bd}"
PUBLIC_API_URL="${PLATFORM_PUBLIC_API_URL:-https://api.onetrack.inventivelab.bd}"
# Include local Vite origins so localhost can call the live API directly if needed.
CORS_ORIGIN="${PLATFORM_CORS_ORIGIN:-https://onetrack.inventivelab.bd,http://localhost:8003,http://127.0.0.1:8003}"
REMOTE_ROOT="${PLATFORM_REMOTE_ROOT:-/opt/onetrack-platform}"
REMOTE_WEB_DIR="$REMOTE_ROOT/web"
DB_PASSWORD_FILE="$REMOTE_ROOT/.env"
ADMIN_EMAIL="$(read_env PLATFORM_ADMIN_EMAIL "$ENV_FILE")"
ADMIN_PASSWORD="$(read_env PLATFORM_ADMIN_PASSWORD "$ENV_FILE")"
AGENCY_PASSWORD="$(read_env SEED_AGENCY_PASSWORD "$ENV_FILE")"
ADMIN_EMAIL="${ADMIN_EMAIL:-aminulislamborhan@gmail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-12345}"
AGENCY_PASSWORD="${AGENCY_PASSWORD:-12345}"

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
"${SSH[@]}" "mkdir -p '$REMOTE_ROOT/server' '$REMOTE_ROOT/db' '$REMOTE_ROOT/deploy' '$REMOTE_WEB_DIR' /etc/caddy/conf.d"

echo "[platform-ui] Uploading static files → $REMOTE_WEB_DIR/"
"${RSYNC[@]}" --delete "$ROOT/dist/" "$TARGET:$REMOTE_WEB_DIR/"

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

if [[ ! -f "\$DB_PASSWORD_FILE" ]]; then
  PW=\$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-28)
  cat > "\$DB_PASSWORD_FILE" <<EOF
PLATFORM_DB_PASSWORD=\$PW
PLATFORM_CORS_ORIGIN=\$CORS_ORIGIN
PLATFORM_ADMIN_EMAIL=\$ADMIN_EMAIL
PLATFORM_ADMIN_PASSWORD=\$ADMIN_PASSWORD
SEED_AGENCY_PASSWORD=\$AGENCY_PASSWORD
EOF
  chmod 600 "\$DB_PASSWORD_FILE"
  echo "[platform-api] wrote new \$DB_PASSWORD_FILE"
else
  set_kv() {
    local k="\$1" v="\$2"
    if grep -q "^\$k=" "\$DB_PASSWORD_FILE"; then
      sed -i "s|^\$k=.*|\$k=\$v|" "\$DB_PASSWORD_FILE"
    else
      echo "\$k=\$v" >> "\$DB_PASSWORD_FILE"
    fi
  }
  set_kv PLATFORM_CORS_ORIGIN "\$CORS_ORIGIN"
  set_kv PLATFORM_ADMIN_EMAIL "\$ADMIN_EMAIL"
  set_kv PLATFORM_ADMIN_PASSWORD "\$ADMIN_PASSWORD"
  set_kv SEED_AGENCY_PASSWORD "\$AGENCY_PASSWORD"
  echo "[platform-api] updated auth + CORS on \$DB_PASSWORD_FILE"
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
echo "[platform-ui] Live → $PUBLIC_UI_URL"
echo "[platform-api] Live → $PUBLIC_API_URL"
