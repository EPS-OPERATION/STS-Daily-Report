#!/usr/bin/env bash
# Backs up the production stack: a Postgres dump and a tarball of the MinIO volume.
#   scripts/backup.sh [backup_dir=./backups] [keep_days=14]
# Run it from cron, then copy the directory off the server (rclone/rsync/S3). A backup that never left the box
# is not a backup. Restore: docs/deployment.md §2.
set -euo pipefail
cd "$(dirname "$0")/.."

DIR="${1:-./backups}"
KEEP="${2:-14}"
PROJECT="${COMPOSE_PROJECT_NAME:-sts}"
STAMP="$(date +%Y%m%d-%H%M%S)"
compose=(docker compose -p "$PROJECT" --env-file .env.prod -f compose.prod.yml)

mkdir -p "$DIR"
DIR="$(cd "$DIR" && pwd)"

"${compose[@]}" exec -T postgres pg_dump -U sts -d sts --no-owner --no-privileges -Fc > "$DIR/sts-$STAMP.dump"
# Fail loudly on an empty dump instead of keeping a useless file.
test -s "$DIR/sts-$STAMP.dump" || { echo "pg_dump produced an empty file" >&2; exit 1; }

MSYS_NO_PATHCONV=1 docker run --rm -v "${PROJECT}_miniodata:/data:ro" -v "$DIR:/out" alpine \
  tar czf "/out/minio-$STAMP.tgz" -C /data .

find "$DIR" \( -name 'sts-*.dump' -o -name 'minio-*.tgz' \) -mtime "+$KEEP" -delete
echo "backup ok: $DIR/sts-$STAMP.dump, $DIR/minio-$STAMP.tgz"
