#!/usr/bin/env bash
# Restore drill: restores the newest OFFSITE Postgres snapshot into a throwaway container and checks it is usable.
# Run it monthly (cron or by hand) on the server; it never touches the production database.
#   scripts/restore-check.sh
# Needs .env.backup (RESTIC_*), docker and restic. Optional HC_RESTORE_PING_URL: Healthchecks.io-style URL for this drill.
# Prints row counts of the restored copy next to production; they differ a little (data written after the dump).
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${COMPOSE_PROJECT_NAME:-sts}"
compose=(docker compose -p "$PROJECT" --env-file .env.prod -f compose.prod.yml)
[ -f .env.backup ] || { echo ".env.backup not found" >&2; exit 1; }
set -a; . ./.env.backup; set +a
: "${RESTIC_REPOSITORY:?set RESTIC_REPOSITORY in .env.backup}"

hc() { [ -n "${HC_RESTORE_PING_URL:-}" ] || return 0; curl -fsS -m 10 --retry 3 -o /dev/null "${HC_RESTORE_PING_URL%/}$1" || true; }
NAME="sts-restore-check-$$"
WORK="$(mktemp -d)"
cleanup() { local code=$?; docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"; [ "$code" -eq 0 ] || hc /fail; }
trap cleanup EXIT
hc /start

restic restore latest --host sts --tag postgres --target "$WORK" >/dev/null
DUMP="$(find "$WORK" -name 'sts-*.dump' | sort | tail -1)"
[ -n "$DUMP" ] || { echo "no Postgres dump found in the newest snapshot" >&2; exit 1; }
echo "restoring $(basename "$DUMP") ($(du -h "$DUMP" | cut -f1)) into a scratch Postgres"

docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=restore-check postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$NAME" pg_isready -U postgres >/dev/null
docker exec -i "$NAME" pg_restore -U postgres -d postgres --no-owner < "$DUMP"

q() { docker exec "$NAME" psql -U postgres -d postgres -At -c "$1"; }
tables="$(q "select count(*) from information_schema.tables where table_schema = 'public'")"
reports="$(q "select count(*) from daily_reports")"
[ "$tables" -gt 0 ] || { echo "restored database has no tables" >&2; exit 1; }
prod_tables="$("${compose[@]}" exec -T postgres psql -U sts -d sts -At -c "select count(*) from information_schema.tables where table_schema = 'public'")"
prod_reports="$("${compose[@]}" exec -T postgres psql -U sts -d sts -At -c "select count(*) from daily_reports")"
echo "restored: $tables tables, $reports daily_reports"
echo "production now: $prod_tables tables, $prod_reports daily_reports"
hc ""
echo "restore check ok"
