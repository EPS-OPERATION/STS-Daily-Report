#!/usr/bin/env bash
# Backs up the production stack: a Postgres dump and the MinIO volume.
#   scripts/backup.sh [backup_dir=./backups] [keep_days=14]
#
# Without .env.backup: local files only (dump + MinIO tarball), as before. That is NOT a backup against losing the
# server. With .env.backup (copy .env.backup.example): the dump and the MinIO data also go, encrypted and incremental,
# to an S3-compatible bucket with restic, old snapshots are pruned, and a Healthchecks.io-style URL is pinged
# (start / success / fail) so a backup that silently stops raises an alert. Setup and restore: docs/deployment.md §4.
set -euo pipefail
cd "$(dirname "$0")/.."

DIR="${1:-./backups}"
KEEP="${2:-14}"
PROJECT="${COMPOSE_PROJECT_NAME:-sts}"
STAMP="$(date +%Y%m%d-%H%M%S)"
compose=(docker compose -p "$PROJECT" --env-file .env.prod -f compose.prod.yml)

# Optional settings (shell syntax, quote the values): RESTIC_*, AWS_*, HC_PING_URL.
if [ -f .env.backup ]; then set -a; . ./.env.backup; set +a; fi

# Never two runs at once (a slow upload must not overlap the next cron tick).
exec 9>"${TMPDIR:-/tmp}/sts-backup.lock"
flock -n 9 || { echo "another backup is still running" >&2; exit 1; }

hc() { # hc [/start|/fail]: ping the heartbeat URL; a monitoring hiccup must never fail the backup
  [ -n "${HC_PING_URL:-}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HC_PING_URL%/}$1" || true
}
finish() { local code=$?; [ "$code" -eq 0 ] || hc /fail; }
trap finish EXIT
hc /start

mkdir -p "$DIR"
DIR="$(cd "$DIR" && pwd)"

"${compose[@]}" exec -T postgres pg_dump -U sts -d sts --no-owner --no-privileges -Fc > "$DIR/sts-$STAMP.dump"
# Fail loudly on an empty dump instead of keeping a useless file.
test -s "$DIR/sts-$STAMP.dump" || { echo "pg_dump produced an empty file" >&2; exit 1; }

if [ -n "${RESTIC_REPOSITORY:-}" ]; then
  command -v restic >/dev/null || { echo "RESTIC_REPOSITORY is set but restic is not installed" >&2; exit 1; }
  restic cat config >/dev/null 2>&1 || { echo "cannot open the restic repository (run 'restic init' once: docs/deployment.md §4)" >&2; exit 1; }
  restic backup --host sts --tag postgres "$DIR/sts-$STAMP.dump"
  # The MinIO volume is streamed as an uncompressed tar so restic can deduplicate it: only new photos upload.
  MSYS_NO_PATHCONV=1 docker run --rm -v "${PROJECT}_miniodata:/data:ro" alpine tar cf - -C /data . |
    restic backup --host sts --tag minio --stdin --stdin-filename minio-data.tar
  restic forget --prune \
    --keep-daily "${RESTIC_KEEP_DAILY:-14}" --keep-weekly "${RESTIC_KEEP_WEEKLY:-8}" --keep-monthly "${RESTIC_KEEP_MONTHLY:-6}"
  # Once a week, prove the repository itself is still readable.
  if [ "$(date +%u)" = "7" ]; then restic check; fi
else
  echo "note: no .env.backup, so this backup stays on this server" >&2
  MSYS_NO_PATHCONV=1 docker run --rm -v "${PROJECT}_miniodata:/data:ro" -v "$DIR:/out" alpine \
    tar czf "/out/minio-$STAMP.tgz" -C /data .
fi

find "$DIR" \( -name 'sts-*.dump' -o -name 'minio-*.tgz' \) -mtime "+$KEEP" -delete
hc ""
echo "backup ok: $DIR/sts-$STAMP.dump${RESTIC_REPOSITORY:+ (and offsite snapshot)}"
