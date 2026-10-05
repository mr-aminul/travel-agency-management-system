#!/usr/bin/env bash
# Deploy the Vite SPA to Cloudflare Workers (temporary preview or claimed account).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CA_DIR="${HOME}/.config/cloudflare-local-ca"
CA_BUNDLE="${CA_DIR}/combined.pem"

refresh_ca_bundle() {
  mkdir -p "$CA_DIR"
  security find-certificate -a -p /Library/Keychains/System.keychain >"${CA_DIR}/system.pem" 2>/dev/null || true
  security find-certificate -a -p "${HOME}/Library/Keychains/login.keychain-db" >"${CA_DIR}/login.pem" 2>/dev/null || true
  security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain >"${CA_DIR}/roots.pem" 2>/dev/null || true
  cat "${CA_DIR}/system.pem" "${CA_DIR}/login.pem" "${CA_DIR}/roots.pem" >"$CA_BUNDLE"
}

if [[ "$(uname -s)" == "Darwin" ]]; then
  refresh_ca_bundle
  export NODE_EXTRA_CA_CERTS="$CA_BUNDLE"
  export SSL_CERT_FILE="$CA_BUNDLE"
fi

npx vite build

# Prefer a claimed/logged-in account when available; otherwise temporary preview.
if npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler deploy
else
  npx wrangler deploy --temporary
fi
