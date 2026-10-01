# STS Daily Report

Internal construction operations / reporting web app (Bun monorepo).

## 1. Project overview

- `apps/web`: React 19 + Vite 6 + TS + MUI 7 / MUI X 8 + TanStack Query 5 + React Hook Form + Zod.
- `apps/api`: Bun + Elysia 1.3 + TS + Drizzle ORM + PostgreSQL 16 (modular monolith).
- `packages/shared`: framework-free constants/types/utils. `packages/env`: zod env contracts.
- `packages/typescript-config`: `base.json` / `web.json` / `api.json`.
- MinIO stores object bytes; PostgreSQL stores metadata. Session authentication protects project, contractor, zone, activity, and site-plan APIs.

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
apps/api/src: config/ db/{schema,migrations,seed} modules/{contractors,projects,zones,site-activities,site-plans} plugins/ shared/{errors,http,storage}
packages/{shared,env,typescript-config}  docker-compose.yml  .env.example
```

Design system "Industrial Operational Minimal": centralized MUI theme (`app/theme/`), navy sidebar
shell, semantic status colors, Inter + Noto Sans Thai. Screens include dashboard, Site Activity
(Konva overlays on the monochrome Master Layout), separate Zone Configuration, daily reports grid,
tomorrow timeline, contractor mobile home, and the five-step evening report. Some unfinished screens
still use data from `src/mock/`; Site Activity and Zone Configuration use PostgreSQL-backed APIs.

Future domains copy the contractors pattern (`projects workers zones daily-reports manpower work-permits qaqc materials tomorrow-plans drone dashboard`).
Zone rule: a zone holds activities from MULTIPLE contractors — never model zone -> single contractor.

## 4. Requirements

Bun >= 1.3, Docker + Compose. Free ports: 5173 web, 3000 api, 5432 pg, 9000/9001 minio.

## 5. Local development

```sh
git clone https://github.com/MojiQAQC/STS-Daily-Report
cd STS-Daily-Report && git checkout dev
cp .env.example .env
bun install
bun docker:up
bun db:migrate
bun db:seed
bun dev  # builds/waits for the Docker API, then starts the web dev server
```

## 6. Environment setup

`.env` is local-only (gitignored). Backend config: `apps/api/src/config/env.ts` (fails fast).
Frontend config: `apps/web/src/config.ts` (`VITE_API_URL` only, no secrets).

## 7. Docker infrastructure

`bun docker:up | docker:logs | docker:down`. Default services: `postgres` (volume pgdata,
`pg_isready` healthcheck) and `minio` (volume miniodata, ports 9000/9001). `bun dev` builds and waits
for the API service in the Compose `app` profile before starting Vite locally; API changes rebuild on
the next `bun dev` run. To rebuild only the API immediately, run
`docker compose --profile app up -d --build --wait api`.
MinIO image pinned to `RELEASE.2025-04-22T22-12-26Z` (`:latest` was removed from Docker Hub).

## 8. Database migrations

```sh
bun db:generate  # schema -> src/db/migrations
bun db:migrate   # apply (needs DATABASE_URL)
bun db:push      # direct push, dev only
bun db:studio
```

Tables: `projects`, `contractors`, `project_contractors` (m2m, composite PK, cascade FKs).
UUID PKs, `created_at/updated_at` timestamptz. Drizzle config: `apps/api/drizzle.config.ts`.

## 9. Seed data

`bun run db:seed` creates/maintains the development user **only**. It never creates product data or grants Site Configuration access.
Development sign-in uses `contractor@sts.local` with no password; the email-only provider is refused in production.

Optional STS setup for a fresh migrated local/dev database:

```sh
bun run db:migrate
bun run db:seed
bun run db:seed:sts-default  # optional explicit native STS bootstrap
```

Then explicitly grant Site Configuration access to the chosen account through your authorized administration process and place missing Facility markers in Site Configuration. No permission is granted by either seed command.

`db:seed:sts-default` creates/reuses Project code `STS-001`, its Master Site Layout, Overview/Top Views and 15 native Facilities. Source images in frontend-public are uploaded to MinIO; Views store object keys and the API provides authenticated presigned read URLs. Reruns reuse stored images and upgrade only the original bootstrap public references, preserving user replacements. MinIO must be available. Markers start empty because there is no approved native coordinate dataset. It seeds no Zones, Parts, Activities or Contractors. Database writes commit together; failed uploads roll back writes and newly uploaded unreferenced objects are cleaned up. Existing names, inactive states and placements are preserved. A renamed default Map is reused; ambiguous matching/default Maps cause a rollback. This command is separate from `db:backfill-facilities`, which migrates persisted legacy data.

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
bun dev
bun run dev:web | bun run dev:api
bun run build | bun run build:web | bun run build:api
bun run lint
bun run lint:fix
bun run format
bun run format:check
bun run typecheck      # all workspaces
bun run check          # lint, format:check, typecheck
bun test               # Bun's built-in test runner
bun db:generate | db:migrate | db:push | db:studio | db:seed
bun docker:up | docker:down | docker:logs
```

Local URLs: web http://localhost:5173 · api http://localhost:3000 (+`/health`, +`/api/v1/contractors`) ·
pg localhost:5432 · minio http://localhost:9000, console http://localhost:9001.
