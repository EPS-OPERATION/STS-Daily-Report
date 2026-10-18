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
`vercel --prod` (or push) builds both services. Check `GET /health` and log in.

### Weather schedule
`POST /api/v1/internal/weather/sync` with `Authorization: Bearer <CRON_SECRET>` hourly. Hobby crons are daily only, so
use Supabase `pg_cron` + `pg_net` (SQL in README → "Hourly site weather"). The route is public by design and checks the
secret itself; it answers 404 while `CRON_SECRET` is unset.

### Known limits on this stage
- Login rate limits are per network peer: behind Vercel everyone may share one peer.
- No security headers (HSTS/CSP) yet, no CI, no error tracking.
- The `public/drone` demo images ship with the web build.

## 2. Production: own VPS (to do)
Not written yet; the checklist:
- `compose.prod.yml`: postgres + (minio **or** keep Supabase Storage) + api + web, secrets from env, **no DB/MinIO ports published**, `restart: unless-stopped`.
- Reverse proxy with automatic HTTPS (Caddy or Traefik) in front of web+api on one domain.
- One-shot migrate container, then API; bootstrap admin once.
- Backups: `pg_dump` on a schedule off-box, plus the MinIO volume; test a restore.
- Firewall: only 80/443 (+ SSH); log rotation; non-root containers.
- `WEATHER_CRON=true` works here (the process is long-lived).
- Moving data from staging: `pg_dump` the database, copy the bucket objects to MinIO under the same keys (keys are stored in the DB).

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
   list the bucket, download, upload to MinIO. Needs a small script (not written yet).
3. Switch env: `DATABASE_URL` (new host), `STORAGE_PROVIDER=minio` + `MINIO_*`, `WEATHER_CRON=true`; delete the `pg_cron` job.
4. Rehearse once on a copy, then freeze writes briefly for the final dump (small database: minutes). Users keep their
   passwords; sessions can simply be re-created by logging in again.
