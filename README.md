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
1 site plan + 16 map areas, 15 buildings + markers. No users and no sample reports — the seeded DB is
deploy-ready; create the first admin with `apps/api/scripts/bootstrap-admin.ts` (see §15). Idempotent.

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
3–20 characters (`a-z`, `0-9`, `.`, `_`, `-`); passwords are 8–128 characters, never trimmed, and must
contain at least 3 of 4 character classes (lowercase, uppercase, numbers, special characters) — the same
rule is shown as a live checklist on the register/reset forms and enforced by the API
(`checkPassword` in `@sts/shared`).
Registration creates a `pending` contractor user without a membership or session. EPS accounts are never
seeded — create the first administrator with the bootstrap script (below).

User administration on `/admin/users` — approvals, contractor linking, password reset links, role changes,
account disable/re-enable — is `eps_admin`-only. Roles: `contractor` (field app), `eps_site` (EPS operations
— review, QAQC, safety, daily work; no user or contractor administration), and `eps_admin` (everything,
including the contractor master data page `/contractors`). An approved contractor without a company sees a
"contact the administrator" screen; the admin links it in one step from the Active tab of `/admin/users`
(**Link contractor** → `POST /users/:id/link`). The registration and link pickers list only contractors of
the current project (`GET /auth/registration-options?projectId=...`). Memberships are project-scoped
(`contractor_memberships.project_id`): the link/approve dialogs record the project, `GET /auth/me` returns
each membership's `projectId`, and the field app only works with memberships of the selected project.
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

- `GET /auth/config` (`allowResubmit` flag), `GET /auth/registration-options?page&pageSize&search&projectId` (contractor IDs/codes/names only)
- `POST /auth/register {email, username, password, contractorId? , companyName?}`
- `POST /auth/login {identifier, password}` (email or username; `{email, password}` is also accepted)
- `POST /auth/reset-password {token, password}`

Session API: `GET /auth/me`, `POST /auth/logout`. Admin-only API (`eps_admin`):
`GET /users?status&page&pageSize&search&projectId`, `POST /users/:id/approve {contractorId?, projectId?}`,
`POST /users/:id/reject {reason}`, `POST /users/:id/link {contractorId, projectId?}`,
`POST /users/:id/reset-password` (returns the raw link once), `PATCH /users/:id/role {role}`, and
`PATCH /users/:id/status {active|disabled}` (disabling revokes the user's sessions; role/status changes on
your own account are rejected). Responses never expose password hashes.
`auth_rate_limits` stores hashed attempt keys: login 30 attempts per identifier per 15 minutes;
registration 100 and reset 60 attempts per network peer per 15 minutes. Behind a proxy the peer can be shared;
configure deployment-level throttling for the real client IP. Expired counter rows can be pruned operationally.

Production uses password auth only — there is no email-only/demo login. `WEB_ORIGIN` is the comma-separated
CORS allowlist; `WEB_URL` is the canonical frontend URL for reset links (defaults to the first allowed origin).

No user accounts are seeded in any environment. Create the first EPS administrator explicitly: set
`EPS_BOOTSTRAP_EMAIL` and `EPS_BOOTSTRAP_PASSWORD` (8–128 chars) in the process environment and run
`bun apps/api/scripts/bootstrap-admin.ts` from the root. It creates the `eps_admin` account when missing, or
initializes the password of an existing passwordless active EPS administrator (revoking its sessions); it
never overwrites an existing password. Never commit the bootstrap secret. Contractors then self-register and
are approved/linked from `/admin/users`. The API dev/migration/seed scripts load the root `.env` explicitly,
including when invoked through workspace filters.

Password login does not verify email ownership; admin approval and private delivery of reset links are the
identity-verification step for this internal workflow.

Verification: `bun typecheck`, `bun test`, `bun run build`. With the local API on port 3000 and local
Postgres on 5432, run `bun --env-file=.env apps/api/scripts/verify-auth-v2.ts` and
`bun --env-file=.env apps/api/scripts/verify-link-request.ts`. Both self-provision their admin fixtures,
check real API responses, membership data, reset/session behavior and concurrency, then remove only the
fixtures they created. Migrations `0016`–`0018` are generated by Drizzle (SQL, snapshot, and journal).
