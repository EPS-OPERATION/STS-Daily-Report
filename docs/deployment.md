# Deployment

Two stages: **staging on Vercel + Supabase**, then **production on our own VPS**. The app is the same in both:
one origin serves the web build and proxies `/api/*` to the API, so cookies are first-party (`sameSite=lax`,
`secure` in production → **HTTPS is required**) and no CORS is needed.

## 1. Staging: Vercel + Supabase

Plans: Vercel **Hobby is non-commercial only** ([fair use](https://vercel.com/docs/limits/fair-use-guidelines));
use **Pro** for EPS work. The API runs on Vercel's **Container Runtime (Beta)**: default port 80, scales to zero after
5 idle minutes (so the in-process weather job does not run), no static IPs. Supabase **Free pauses after a week idle
and has no backups**; use Pro for anything real.

### Supabase
1. Create the project (region near the Vercel region, `syd1` in `vercel.json`).
2. Storage → create a **private** bucket named like `STORAGE_BUCKET` (default `sts`). The API never creates it.
3. Connection strings (Project → Connect):
   - `DATABASE_URL` = **transaction pooler** (`…pooler.supabase.com:6543/postgres`) for the running API (the client turns prepared statements off automatically).
   - `MIGRATE_DATABASE_URL` = **session pooler** (`:5432`, IPv4-friendly) or direct, used only to migrate.

### Vercel project environment variables
| Name | Value |
|---|---|
| `NODE_ENV` | `production` (set by `Dockerfile.vercel`) |
| `DATABASE_URL` | transaction pooler URL |
| `STORAGE_PROVIDER` | `supabase` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | from Supabase (server-side only, never `VITE_*`) |
| `WEB_ORIGIN`, `WEB_URL` | `https://<your-domain>` |
| `CRON_SECRET` | 16+ random chars (`bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `WEATHER_CRON` | `false` (the process sleeps; use the scheduler below) |
| `VITE_API_URL` | leave unset: production builds default to `/api/v1` |

### First deploy
```sh
# 1. migrate (from your machine, using the session/direct URL)
MIGRATE_DATABASE_URL=… DATABASE_URL=… bun db:migrate
# 2. seed master data (zones, buildings, contractors; no users)
DATABASE_URL=… bun db:seed
# 3. first administrator
EPS_BOOTSTRAP_EMAIL=… EPS_BOOTSTRAP_PASSWORD=… DATABASE_URL=… bun apps/api/scripts/bootstrap-admin.ts
```
`vercel --prod` (or push) builds both services. Then run the smoke test (web shell, security headers, deep links, `/health`,
auth is enforced, login + `Secure` cookie, cron route):
```sh
SMOKE_EMAIL=admin@company.com SMOKE_PASSWORD=... CRON_SECRET=... scripts/smoke.sh https://<your-domain>
```
Use the same command after a VPS deploy. A failing line names exactly what is wrong.

### Weather schedule
`POST /api/v1/internal/weather/sync` with `Authorization: Bearer <CRON_SECRET>` hourly. Hobby crons are daily only, so
use Supabase `pg_cron` + `pg_net` (SQL in README → "Hourly site weather"). The route is public by design and checks the
secret itself; it answers 404 while `CRON_SECRET` is unset.

### Known limits on this stage
- Set `TRUST_PROXY=true` on the API so login/registration rate limits use the real client IP (X-Forwarded-For), not Vercel's.
- Security headers (CSP, HSTS, nosniff, frame-ancestors) come from `vercel.json` `headers`; confirm they appear on the first deploy (`curl -I`). The API adds its own nosniff/no-store headers.
- Demo drone photos live in `apps/api/seed-assets/drone` (not in the web bundle); `db:seed` skips them when `NODE_ENV=production` or `SEED_DEMO=false`.
- CI (`.github/workflows/ci.yml`) runs typecheck, tests, `check:arch`, build, migrate+seed on an empty Postgres, and the golden API snapshot.

## 2. Production: own VPS
Tested locally end to end (HTTPS via Caddy, migrations, login with a `Secure` cookie, photo upload, signed photo URL on the
public files host, backup + restore). Files: `compose.prod.yml`, `Caddyfile`, `.env.prod.example`, `scripts/backup.sh`.

Stack: Caddy (80/443, automatic certificates) → `web` (nginx, security headers) and `api` (`/api/*`); `postgres` and `minio`
are **not published**; `migrate` is a one-shot that runs before the API.

1. DNS: `A` records for `APP_DOMAIN` and `FILES_DOMAIN` (photos are served from the second host) to the VPS. Open only 80/443 + SSH.
2. `cp .env.prod.example .env.prod` and fill in the domains and long random passwords. Never commit `.env.prod`.
3. `docker compose --env-file .env.prod -f compose.prod.yml up -d --build`
4. First time only, seed master data (no demo data in production) and create the administrator:
   ```sh
   docker compose --env-file .env.prod -f compose.prod.yml exec api bun src/db/seed/seed.ts
   docker compose --env-file .env.prod -f compose.prod.yml exec -e EPS_BOOTSTRAP_EMAIL=you@company.com -e EPS_BOOTSTRAP_PASSWORD='...' api bun scripts/bootstrap-admin.ts
   ```
5. Backups: `scripts/backup.sh [dir] [keep_days]` writes a `pg_dump` (custom format) and a MinIO volume tarball. Run it from cron
   and copy the directory **off the server**. Restore the database with
   `docker compose ... exec -T postgres pg_restore -U sts -d sts --no-owner --clean --if-exists < sts-<stamp>.dump`
   (verified on a scratch database: identical row counts).
6. Updates: `git pull && docker compose --env-file .env.prod -f compose.prod.yml up -d --build` (migrations run automatically).
7. The weather job runs inside the API (`WEATHER_CRON=true`); `CRON_SECRET` is optional here.
8. Rate limits and X-Forwarded-For: `TRUST_PROXY=true` is set in `compose.prod.yml` because only Caddy can reach the API.
   Never enable it when the API is reachable directly.

Moving data from staging: `pg_dump` + `pg_restore` the database (§3) and `apps/api/scripts/copy-storage.ts` for the files.

## 3. Leaving Supabase for plain Postgres (checked against the code)
The app only needs **plain PostgreSQL + object storage**. Nothing Supabase-specific is in the schema or migrations:
no extensions (UUIDs use core `gen_random_uuid()`), no RLS, no `auth.*`/`storage.*` schemas, no Supabase Auth (login is our own).
The only Supabase touchpoints are the storage adapter (`STORAGE_PROVIDER=supabase`), the pooler tweak in `db/client.ts`
(applies only to a `:6543` URL), and the hourly `pg_cron` job (outside the code).

Supabase Cloud is a hosted service: you do not run Docker for it. (Self-hosting Supabase is a separate multi-container
stack and is not needed here; a single `postgres:16` container is enough.)

Cut-over:
1. `pg_dump` over the session pooler or direct URL, keeping only our data:
   `pg_dump --no-owner --no-privileges --schema=public --schema=drizzle -Fc -f sts.dump "$MIGRATE_DATABASE_URL"`
   (the `drizzle` schema holds the migration journal). Restore into the new Postgres with `pg_restore --no-owner`.
   Use the same or a newer Postgres major version than the dump (see the Supabase dashboard).
2. Copy storage objects to MinIO with the **same keys** (keys live in `daily_report_photos.object_key` and `drone_logs.object_key`):
   `SRC_PROVIDER=supabase SRC_SUPABASE_URL=... SRC_SUPABASE_SERVICE_ROLE_KEY=... SRC_BUCKET=sts bun --env-file=../../.env apps/api/scripts/copy-storage.ts [--dry-run]`
   (run from `apps/api`; it reads the keys from the restored database, so restore the database first; re-runnable; tested between two MinIO buckets).
3. Switch env: `DATABASE_URL` (new host), `STORAGE_PROVIDER=minio` + `MINIO_*`, `WEATHER_CRON=true`; delete the `pg_cron` job.
4. Rehearse once on a copy, then freeze writes briefly for the final dump (small database: minutes). Users keep their
   passwords; sessions can simply be re-created by logging in again.
