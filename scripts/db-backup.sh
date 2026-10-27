#!/usr/bin/env bash
# Encrypted logical backup of the staging database (Supabase) — used by CI before each deploy and nightly.
# Needs: DATABASE_URL (Supabase session pooler :5432), BACKUP_PASSPHRASE (keep a copy outside GitHub!), docker, gpg.
# Output: $1 (default backup.dump.gpg) = pg_dump custom format, AES-256 encrypted.
# Restore (on a machine with the passphrase):
#   gpg --batch --passphrase "$BACKUP_PASSPHRASE" -d backup.dump.gpg > backup.dump
#   pg_restore --no-owner --no-privileges -d "$TARGET_DATABASE_URL" backup.dump
# Photos in Supabase Storage are not included (database only).
set -euo pipefail
out="${1:-backup.dump.gpg}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
# Client must match the server major version (Postgres 17 on Supabase).
docker run --rm -e DATABASE_URL postgres:17 \
  pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --schema=public --schema=drizzle \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" -o "$out"
size=$(stat -c %s "$out")
[ "$size" -gt 1024 ] || { echo "backup looks empty ($size bytes)" >&2; exit 1; }
echo "backup written: $out ($size bytes)"
