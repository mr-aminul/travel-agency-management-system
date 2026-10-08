#!/usr/bin/env bash
# Point Caddy UI symlink at a previous web-releases/<sha> on the VPS.
# Usage: RELEASE_SHA=<12-char> bash scripts/rollback-vps-ui.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

read_env() {
  local key="$1"
  local file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

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
REMOTE_ROOT="${PLATFORM_REMOTE_ROOT:-/opt/onetrack-platform}"
REMOTE_WEB_DIR="$REMOTE_ROOT/web"
REMOTE_RELEASES_DIR="$REMOTE_ROOT/web-releases"
RELEASE_SHA="${RELEASE_SHA:-}"

if [[ -z "$HOST" || -z "$USER_NAME" || -z "$PASS" ]]; then
  echo "VPS_HOST / VPS_USER / VPS_PASSWORD missing (env or .env)" >&2
  exit 1
fi

if [[ -z "$RELEASE_SHA" ]]; then
  echo "RELEASE_SHA is required (e.g. first 12 chars of the git commit)" >&2
  exit 1
fi

RELEASE_SHA="${RELEASE_SHA:0:12}"
REMOTE_RELEASE_DIR="$REMOTE_RELEASES_DIR/$RELEASE_SHA"

if ! command -v sshpass >/dev/null; then
  echo "sshpass is required for password SSH" >&2
  exit 1
fi

TARGET="${USER_NAME}@${HOST}"
SSH=(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no "$TARGET")

echo "[platform-ui] Rolling back → $REMOTE_RELEASE_DIR"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
REMOTE_WEB_DIR='$REMOTE_WEB_DIR'
REMOTE_RELEASE_DIR='$REMOTE_RELEASE_DIR'
if [[ ! -d "\$REMOTE_RELEASE_DIR" ]]; then
  echo "Release not found: \$REMOTE_RELEASE_DIR" >&2
  echo "Available:" >&2
  ls -1 '$REMOTE_RELEASES_DIR' >&2 || true
  exit 1
fi
ln -sfn "\$REMOTE_RELEASE_DIR" "\$REMOTE_WEB_DIR"
echo "[platform-ui] symlink → \$REMOTE_RELEASE_DIR"
REMOTE

UI_HEADERS="$(curl -fsSI "$PUBLIC_UI_URL/")"
echo "$UI_HEADERS" | tr -d '\r' | grep -qi '^x-app: onetrack-platform-ui' || {
  echo "UI check failed after rollback" >&2
  echo "$UI_HEADERS" >&2
  exit 1
}
echo "[platform-ui] Rollback live → $PUBLIC_UI_URL (release $RELEASE_SHA)"
