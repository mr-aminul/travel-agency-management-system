#!/usr/bin/env bash
# Smoke checks against the live platform API.
set -euo pipefail

API="${1:-https://api.onetrack.inventivelab.bd}"
EMAIL="${PLATFORM_ADMIN_EMAIL:-aminulislamborhan@gmail.com}"
PASS="${PLATFORM_ADMIN_PASSWORD:-12345}"
AGENCY_EMAIL="${SMOKE_AGENCY_EMAIL:-ops@onetrack.bd}"
AGENCY_PASS="${SEED_AGENCY_PASSWORD:-12345}"

echo "[smoke] health"
curl -fsS "$API/api/platform/health" | head -c 200
echo

echo "[smoke] login agency"
LOGIN=$(curl -fsS -X POST "$API/api/platform/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$AGENCY_EMAIL\",\"password\":\"$AGENCY_PASS\"}")
TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); if(!j.accessToken) process.exit(1); process.stdout.write(j.accessToken)" "$LOGIN")
TENANT=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.tenantId||'')" "$LOGIN")
echo "  tenant=$TENANT token_len=${#TOKEN}"

echo "[smoke] kv hydrate (must not leak other tenants' full dump without auth filter)"
KV=$(curl -fsS "$API/api/platform/kv" -H "Authorization: Bearer $TOKEN")
node -e '
const j=JSON.parse(process.argv[1]);
const e=j.entries||{};
const keys=Object.keys(e).sort();
console.log("  keys", keys.length, keys.slice(0,12).join(","));
for (const k of ["pd-clients-created","pd-cases-created","pd-payments-created"]) {
  const v=e[k];
  if (!Array.isArray(v)) { console.log("  ", k, "missing/empty"); continue; }
  const foreign=v.filter(x=>x && x.tenantId && x.tenantId!==process.argv[2]);
  console.log("  ", k, "count="+v.length, "foreign="+foreign.length);
  if (foreign.length) process.exit(2);
}
' "$KV" "$TENANT"

echo "[smoke] unauthenticated kv must 401"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/platform/kv")
if [[ "$CODE" != "401" ]]; then echo "  FAIL expected 401 got $CODE"; exit 3; fi
echo "  ok 401"

echo "[smoke] write payment via domain key"
PAY_ID="pay-smoke-$(date +%s)"
curl -fsS -X PUT "$API/api/platform/kv/pd-payments-created" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"value\":[{\"id\":\"$PAY_ID\",\"tenantId\":\"$TENANT\",\"clientId\":\"c-smoke\",\"caseId\":\"case-smoke\",\"amount\":100,\"method\":\"Cash\",\"createdAt\":\"2026-10-08\"}]}" >/dev/null

KV2=$(curl -fsS "$API/api/platform/kv" -H "Authorization: Bearer $TOKEN")
node -e '
const j=JSON.parse(process.argv[1]);
const pays=j.entries?.["pd-payments-created"]||[];
const hit=pays.find(p=>p.id===process.argv[2]);
if(!hit){ console.error("  FAIL payment not found after write"); process.exit(4); }
console.log("  payment persisted", hit.id, hit.amount);
' "$KV2" "$PAY_ID"

echo "[smoke] public track endpoint responds"
TRACK_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/platform/public/track?passport=NOSUCH999")
echo "  track missing passport → $TRACK_CODE (expect 404)"

echo "[smoke] admin login"
ADMIN=$(curl -fsS -X POST "$API/api/platform/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
ADMIN_TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.accessToken||'')" "$ADMIN")
echo "  admin token_len=${#ADMIN_TOKEN}"

echo "[smoke] OK"
