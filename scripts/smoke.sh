#!/usr/bin/env bash
# Smoke test for a deployed STS stack (Vercel+Supabase staging or the VPS). Exit code 1 if any check fails.
#
#   scripts/smoke.sh https://staging.example.com
#   SMOKE_EMAIL=admin@company.com SMOKE_PASSWORD='...' CRON_SECRET=... scripts/smoke.sh https://staging.example.com
#
# One URL when web and API share an origin (Vercel rewrite, Caddy). If they differ (local dev compose):
#   WEB_BASE=http://localhost:5174 API_ORIGIN=http://localhost:3001 scripts/smoke.sh
# Optional: SMOKE_EXPECT_AUTH=false (dev servers leave some reads open), SMOKE_INSECURE=true (self-signed certificates).
set -u

WEB_BASE="${WEB_BASE:-${1:-}}"
API_ORIGIN="${API_ORIGIN:-$WEB_BASE}"
[ -n "$WEB_BASE" ] || { echo "usage: scripts/smoke.sh <base-url>" >&2; exit 2; }
WEB_BASE="${WEB_BASE%/}"; API_ORIGIN="${API_ORIGIN%/}"
API="$API_ORIGIN/api/v1"
EXPECT_AUTH="${SMOKE_EXPECT_AUTH:-true}"
CURL=(curl -s --max-time 20)
[ "${SMOKE_INSECURE:-false}" = "true" ] && CURL+=(-k)
JAR="$(mktemp)"; trap 'rm -f "$JAR"' EXIT

fails=0
ok()   { echo "PASS  $1"; }
bad()  { echo "FAIL  $1"; fails=$((fails + 1)); }
check() { # check "name" "actual" "expected-substring"
  if [[ "$2" == *"$3"* ]]; then ok "$1"; else bad "$1 (got: ${2:0:80})"; fi
}
status() { "${CURL[@]}" -o /dev/null -w '%{http_code}' "$@"; }

echo "== web: $WEB_BASE"
check "GET / returns the app shell" "$("${CURL[@]}" "$WEB_BASE/")" 'id="root"'
headers="$("${CURL[@]}" -I "$WEB_BASE/" | tr -d '\r')"
for h in "x-content-type-options: nosniff" "x-frame-options: DENY" "content-security-policy:"; do
  if echo "$headers" | grep -qi "^$h"; then ok "header $h"; else bad "missing header $h"; fi
done
if [[ "$WEB_BASE" == https://* ]]; then
  if echo "$headers" | grep -qi "^strict-transport-security:"; then ok "header strict-transport-security"; else bad "missing header strict-transport-security"; fi
fi
check "deep link /site-plan serves the SPA (no bad redirect)" "$(status "$WEB_BASE/site-plan")" "200"

echo "== api: $API_ORIGIN"
check "GET /health" "$("${CURL[@]}" "$API_ORIGIN/health")" '"status":"ok"'
check "GET /health/ready (database reachable)" "$("${CURL[@]}" "$API_ORIGIN/health/ready")" '"db":"ok"'
check "GET /auth/config is public" "$(status "$API/auth/config")" "200"
if [ "$EXPECT_AUTH" = "true" ]; then
  check "GET /projects without a session is refused" "$(status "$API/projects")" "401"
fi

if [ -n "${SMOKE_EMAIL:-}" ] && [ -n "${SMOKE_PASSWORD:-}" ]; then
  echo "== login as $SMOKE_EMAIL"
  body=$(printf '{"identifier":"%s","password":"%s"}' "$SMOKE_EMAIL" "$SMOKE_PASSWORD")
  code="$(status -c "$JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "$body")"
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then ok "POST /auth/login ($code)"; else bad "POST /auth/login (got $code)"; fi
  if [[ "$API_ORIGIN" == https://* ]]; then
    if grep -q "sts_session" "$JAR" && awk '/sts_session/ {print $4}' "$JAR" | grep -qi TRUE; then ok "session cookie is Secure"; else bad "session cookie missing or not Secure"; fi
  fi
  check "GET /auth/me with the cookie" "$(status -b "$JAR" "$API/auth/me")" "200"
  check "GET /projects with the cookie" "$(status -b "$JAR" "$API/projects")" "200"
else
  echo "-- skipping login checks (set SMOKE_EMAIL and SMOKE_PASSWORD)"
fi

if [ -n "${CRON_SECRET:-}" ]; then
  echo "== weather cron route"
  check "sync with a wrong secret is refused" "$(status -X POST -H 'Authorization: Bearer wrong-secret-value' "$API/internal/weather/sync")" "401"
  check "sync with the right secret works" "$(status -X POST -H "Authorization: Bearer $CRON_SECRET" "$API/internal/weather/sync")" "200"
else
  echo "-- skipping cron checks (set CRON_SECRET)"
fi

echo
if [ "$fails" -eq 0 ]; then echo "all checks passed"; else echo "$fails check(s) failed"; exit 1; fi
