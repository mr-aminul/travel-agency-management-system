#!/usr/bin/env bash
# Deploy OneTrack platform API + Postgres to the inventivelab VPS.
# UI stays on Vercel at https://onetrack.inventivelab.bd
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
PUBLIC_API_URL="${PLATFORM_PUBLIC_API_URL:-https://api.onetrack.inventivelab.bd}"
CORS_ORIGIN="${PLATFORM_CORS_ORIGIN:-https://onetrack.inventivelab.bd,https://onetrack-iota.vercel.app}"
REMOTE_ROOT="${PLATFORM_REMOTE_ROOT:-/opt/onetrack-platform}"
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

echo "[platform-api] Ensuring remote dirs …"
"${SSH[@]}" "mkdir -p '$REMOTE_ROOT/server' '$REMOTE_ROOT/db' '$REMOTE_ROOT/deploy' /etc/caddy/conf.d"

echo "[platform-api] Uploading API sources …"
"${RSYNC[@]}" --exclude node_modules "$ROOT/server/" "$TARGET:$REMOTE_ROOT/server/"
"${RSYNC[@]}" "$ROOT/db/" "$TARGET:$REMOTE_ROOT/db/"
"${RSYNC[@]}" "$ROOT/deploy/" "$TARGET:$REMOTE_ROOT/deploy/"

echo "[platform-api] Configuring isolated DB + Caddy …"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
REMOTE_ROOT='$REMOTE_ROOT'
DB_PASSWORD_FILE='$DB_PASSWORD_FILE'
CORS_ORIGIN='$CORS_ORIGIN'

if [[ ! -f "\$DB_PASSWORD_FILE" ]]; then
  PW=\$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-28)
  cat > "\$DB_PASSWORD_FILE" <<EOF
PLATFORM_DB_PASSWORD=\$PW
PLATFORM_CORS_ORIGIN=\$CORS_ORIGIN
EOF
  chmod 600 "\$DB_PASSWORD_FILE"
  echo "[platform-api] wrote new \$DB_PASSWORD_FILE"
else
  if grep -q '^PLATFORM_CORS_ORIGIN=' "\$DB_PASSWORD_FILE"; then
    sed -i "s|^PLATFORM_CORS_ORIGIN=.*|PLATFORM_CORS_ORIGIN=\$CORS_ORIGIN|" "\$DB_PASSWORD_FILE"
  else
    echo "PLATFORM_CORS_ORIGIN=\$CORS_ORIGIN" >> "\$DB_PASSWORD_FILE"
  fi
  echo "[platform-api] updated CORS on \$DB_PASSWORD_FILE"
fi

cp "\$REMOTE_ROOT/deploy/Caddyfile.api.snippet" /etc/caddy/conf.d/onetrack-platform-api.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

cd "\$REMOTE_ROOT/deploy"
docker compose --env-file "\$DB_PASSWORD_FILE" -f docker-compose.yml up -d --build

sleep 3
curl -fsS "http://127.0.0.1:4010/api/platform/health"
echo
REMOTE

echo "[platform-api] Public checks …"
curl -fsS -w "  API %{http_code}\n" "$PUBLIC_API_URL/api/platform/health"
echo "[platform-api] Live → $PUBLIC_API_URL"
echo "[platform-ui] Vercel → https://onetrack.inventivelab.bd (push to main to redeploy UI)"
