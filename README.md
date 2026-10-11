# STS Daily Report

Internal construction operations / reporting web app (Bun monorepo).

## 1. Project overview

- `apps/web`: React 19 + Vite 6 + TS + MUI 7 / MUI X 8 + TanStack Query 5 + React Hook Form + Zod.
- `apps/api`: Bun + Elysia 1.3 + TS + Drizzle ORM + PostgreSQL 16 (modular monolith).
- `packages/shared`: framework-free constants/types/utils. `packages/env`: zod env contracts.
- `packages/typescript-config`: `base.json` / `web.json` / `api.json`.
- MinIO/Supabase Storage hold object bytes; Postgres stores metadata. Auth uses password login, EPS-approved contractor registration, and opaque server sessions.

## 2. Architecture

One-way dependencies: `apps/* -> packages/*` (packages never import apps).
Backend per module: `Route -> Service -> Repository -> Drizzle -> PostgreSQL`.
Frontend per feature: `Page -> Hook (Query) -> Feature API -> HTTP client -> Elysia REST`.
Reference implementations: `apps/web/src/features/contractors`, `apps/api/src/modules/contractors`.
No Base* classes, no DI framework, no codegen CRUD.

## 3. Repository structure

```text
apps/web/src: app/{providers,router,layouts,theme} pages/ features/<domain>/{api,components,hooks,schemas,types}
  components/{ui,site,field} mock/site-data.ts services/http/
apps/api/src: config/ db/{schema,migrations,seed} modules/contractors plugins/ shared/{errors,http,storage}
packages/{shared,env,typescript-config}  docker-compose.yml  .env.example
```

Design system "Industrial Operational Minimal": centralized MUI theme (`app/theme/`), navy sidebar
shell, semantic status colors, Inter + Noto Sans Thai. Screens: dashboard, site plan (schematic SVG +
drawer), daily reports grid, tomorrow timeline, contractor mobile home + 5-step evening report.
Mock data in `src/mock/` only where backend modules do not exist yet; contractors use the live API.

Future domains copy the contractors pattern (`projects workers zones daily-reports manpower work-permits qaqc materials tomorrow-plans drone dashboard`).
Zone rule: a zone holds activities from MULTIPLE contractors — never model zone -> single contractor.

## 4. Requirements

Bun >= 1.3, Docker + Compose. Free host ports: 5173 web, 3000 api, 5432 pg, 9000/9001 minio.

## 5. Local development

```sh
git clone https://github.com/EPS-OPERATION/STS-Daily-Report
cd STS-Daily-Report && git checkout dev
cp .env.example .env
bun install
bun docker:up
bun db:migrate
bun db:seed
bun dev
```

## 6. Environment setup

`.env` is local-only (gitignored). Backend config: `apps/api/src/config/env.ts` (fails fast).
Frontend config: `apps/web/src/config.ts` (`VITE_API_URL` only, no secrets).

## 7. Docker infrastructure

`bun docker:up | docker:logs | docker:down`. Services: `postgres` (volume pgdata, pg_isready
healthcheck, host port 5432), `minio` (volumes miniodata, host ports 9000/9001).
MinIO image pinned to `RELEASE.2025-04-22T22-12-26Z` (`:latest` was removed from Docker Hub).

## 8. Database migrations

```sh
bun db:generate  # schema -> src/db/migrations
bun db:migrate   # apply (needs DATABASE_URL)
bun db:push      # direct push, dev only
bun db:studio
```

Tables: `projects`, `contractors`, `project_contractors` (m2m), auth (`users`, `contractor_memberships`, `sessions`, `password_reset_tokens`, `auth_rate_limits`),
site plan (`zones`, `site_plans`, `zone_map_areas`, `site_activities`), daily report (`buildings`, `daily_reports`,
`daily_report_allocations`, `daily_report_machinery`, `daily_report_permits`, `daily_report_photos`).
UUID PKs, `created_at/updated_at` timestamptz. Drizzle config: `apps/api/drizzle.config.ts`.

## 9. Seed data

`bun db:seed` — master data only: 1 project (STS-001), 23 site contractors + project links, 21 zones +
1 site plan + 16 map areas, 15 buildings + markers, dev logins (`eps` / `contractor` / `trial` /
`contractor01–03`). No sample reports — the seeded DB is deploy-ready (demo rows live in git history
before 2026-10-11). Idempotent.

## 10. Frontend conventions

- Feature owns api/keys/components/hooks/schemas/types; keys via `contractorKeys.all/lists/list/details/detail`.
- No raw fetch in components; no server state in Context; no global store.
- Forms: RHF + zodResolver; errors via MUI Alert/Dialog, never `alert()`.
- Theme tokens only (`src/app/theme/`); files kebab-case, components PascalCase.

## 11. Backend conventions

- Module files: `*.route.ts` (HTTP+TypeBox) / `*.service.ts` (rules) / `*.repository.ts` (Drizzle only) /
  `*.schema.ts` / `*.type.ts`. No SQL in routes, no HTTP in repositories.
- Errors: `AppError/ValidationError/NotFoundError/ConflictError` -> `{error:{code,message,details}}`
  (400/404/409/500). Never leak stack/DB errors in production.
- Storage behind `StorageService` (`upload/remove/getPresignedUrl`); modules never import minio client.
- List APIs: `page/pageSize/sort/order/search` -> `{data, meta:{page,pageSize,total}}`, server-side Data Grid ready.

## 12. Adding a frontend feature

Copy `src/features/contractors/` -> `src/features/<domain>/`, write schema/types/keys/api/hooks/components,
add page + route, invalidate `<domain>Keys.lists()` on mutation.

## 13. Adding a backend module

Add `src/db/schema/<domain>.schema.ts`, export from index, `bun db:generate`; copy
`src/modules/contractors/` -> `src/modules/<domain>/`; implement repository/service/route;
mount under `/api/v1` in `src/app.ts`; reuse `normalizePagination`, `ok/paginated`, `AppError`.

## 14. Common scripts

```sh
bun dev | dev:web | dev:api
bun build | build:web | build:api
bun typecheck          # all workspaces
bun db:generate | db:migrate | db:push | db:studio | db:seed
bun docker:up | docker:down | docker:logs
```

Local URLs: web http://localhost:5173 · api http://localhost:3000 (+`/health`, +`/api/v1/contractors`) ·
pg localhost:5432 · minio http://localhost:9000, console http://localhost:9001.

## 15. Authentication v2

`/login` has Sign in and Create account tabs. Contractor registration stores normalized email and username,
an Argon2id password hash, and exactly one requested contractor or free-text company name. Usernames are
3–20 characters (`a-z`, `0-9`, `.`, `_`, `-`); passwords are 8–128 characters and are never trimmed.
Registration creates a `pending` contractor user without a membership or session. EPS accounts remain seeded.

EPS staff use `/admin/users` to approve or reject registrations. Roles: `contractor` (field app), `eps_site`
(EPS operations — review, QAQC, safety, approvals; sees only the pending queue in `/admin/users`), and
`eps_admin` (adds password reset links, role changes, account disable/re-enable; only `eps_admin` sees the
contractor master data page `/contractors` or can browse active/rejected/disabled users). An approved
contractor without a company sees a self-service picker on the field page: `POST /auth/link-request`
stores the chosen contractor and the row reappears in the pending queue as a link request for EPS to approve.
Approval can select an existing contractor;
membership and approval are committed together. Approving an Other company without a mapping preserves
its name and creates no contractor or membership. The signed-in field app shows an unlinked-company state
and does not permit report submission. Rejection requires a reason; only a correct password reveals a
pending/rejected account message. These accounts cannot obtain sessions.

EPS can generate a reset link for an active user and send it privately via LINE. There is no email service
or Forgot password form. `/reset-password?token=...` accepts a new password without requiring a session.
Links last 60 minutes, are single-use, and only their SHA-256 hashes are stored. Issuing a replacement
invalidates previous links. Reset completion changes the password, consumes all reset links, and revokes
all sessions in one transaction. Password login and reset synchronize on the user row.

Public API (exact methods; all paths below use `/api/v1`):

- `GET /auth/config`, `GET /auth/registration-options?page&pageSize&search` (contractor IDs/codes/names only)
- `POST /auth/register {email, username, password, contractorId? , companyName?}`
- `POST /auth/login {identifier, password}` (email or username); legacy demo body `{email, accessCode?}` remains supported
- `POST /auth/reset-password {token, password}`

Session API: `GET /auth/me`, `POST /auth/logout`. Staff API (`eps_site`/`eps_admin`):
`GET /users?status&page&pageSize&search` (eps_site may only query `status=pending`),
`POST /users/:id/approve {contractorId?}`, `POST /users/:id/reject {reason}`. Admin-only API:
`POST /users/:id/reset-password` (returns the raw link once), `PATCH /users/:id/role {role}`, and
`PATCH /users/:id/status {active|disabled}` (disabling revokes the user's sessions; role/status changes on
your own account are rejected). Responses never expose password hashes.
`auth_rate_limits` stores hashed attempt keys: login 30 attempts per identifier per 15 minutes;
registration 100 and reset 60 attempts per network peer per 15 minutes. Behind a proxy the peer can be shared;
configure deployment-level throttling for the real client IP. Expired counter rows can be pruned operationally.

Normal production: `AUTH_PROVIDER=password`, `ALLOW_DEMO_LOGIN=false`. `WEB_ORIGIN` is the comma-separated
CORS allowlist; `WEB_URL` is the canonical frontend URL for reset links (defaults to the first allowed origin).
Legacy email-only demos require `ALLOW_DEMO_LOGIN=true`, or `AUTH_PROVIDER=local-email` outside production,
and are restricted to the six seeded identities. `DEMO_ACCESS_CODE` applies only to that demo path.
Keep hosted demos behind deployment protection. Newly registered users can never use email-only login.

Local development seed users: `eps@sts.local` (eps_admin), `eps-site@sts.local` (eps_site),
`contractor@sts.local`, `trial@sts.local`, and `contractor01@sts.local`–`contractor03@sts.local`;
usernames are their email prefixes, default password `sts123456`. Demo identities are seeded only in
development or when `ALLOW_DEMO_LOGIN=true` — a production seed inserts just the EPS administrator.
Credentials are initialized only in development when missing; seed never overwrites a changed
password. Do not use these shared credentials for a live deployment. The API dev/migration/seed scripts load
the root `.env` explicitly, including when invoked through workspace filters.

For an existing production EPS administrator account with no password, an operator sets `EPS_BOOTSTRAP_EMAIL` and
`EPS_BOOTSTRAP_PASSWORD` through the process environment and runs
`bun apps/api/scripts/bootstrap-eps-password.ts` from the root. This initializes only a passwordless active
EPS account and revokes its sessions; it cannot overwrite an existing password. Never commit the bootstrap
secret or place a default production password in seed data. Password login does not verify email ownership;
EPS approval and private delivery of reset links are the identity-verification step for this internal workflow.

Verification: `bun typecheck`, `bun test`, `bun run build`. With the local API on port 3000 and local
Postgres on 5432, run `bun --env-file=.env apps/api/scripts/verify-auth-v2.ts`. This checks actual API responses,
membership data, reset/session behavior and concurrency, then removes only its uniquely named QA users.
Migration `0016_elite_turbo` is generated by Drizzle (SQL, snapshot, and journal).
