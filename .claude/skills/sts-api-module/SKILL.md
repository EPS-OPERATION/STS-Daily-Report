---
name: sts-api-module
description: Step-by-step recipe for adding or changing a backend module in apps/api (Elysia + Drizzle + PostgreSQL) of STS Daily Report - schema file, migration, repository/service/route split, TypeBox validation, pagination, AppError envelope, requireAuth guard, mounting under /api/v1, seed. Use for any new table, endpoint or migration.
---

# Add / change an API module

Reference implementation: `apps/api/src/modules/contractors/` (plain CRUD) and
`apps/api/src/modules/site-activities/` (project-scoped routes + `requireAuth`). Copy, don't abstract.

## Layers (one-way)

`<domain>.route.ts` → `<domain>.service.ts` → `<domain>.repository.ts` → Drizzle → PostgreSQL

- **route**: HTTP only. TypeBox schemas from `<domain>.schema.ts` on `params/query/body`; wrap output with
  `ok(...)` / `paginated(rows, page, pageSize, total)` from `@/shared/http/response.js`; `set.status = 201/204`.
- **service**: business rules; throws `ValidationError | NotFoundError | ConflictError | AuthRequiredError`
  from `@/shared/errors/app-error.js`. Gets db via `getDb()`.
- **repository**: Drizzle queries only, takes `db` as first arg. No HTTP, no AppError decisions beyond returning null.
- **type**: input/query TS types. **index.ts**: re-export types + `export { <domain>Routes }`.
- No Base* classes, no DI container, no generic CRUD generator. No SQL in routes.

## Steps

1. Schema: `apps/api/src/db/schema/<domain>.schema.ts` — `uuid("id").primaryKey().defaultRandom()`,
   snake_case columns, `created_at/updated_at` `timestamptz defaultNow()`, FKs with explicit `onDelete`,
   `check(...)` for ranges, indexes for the filters you query by. Calendar days use `date(...)`; time-of-day `"HH:MM"` text.
2. Export it from `apps/api/src/db/schema/index.ts`.
3. `bun db:generate` → review the new SQL in `src/db/migrations/` (never hand-edit old migrations) → `bun db:migrate`.
4. Write repository → service → schema (TypeBox) → route → index.
5. Mount in `apps/api/src/app.ts` inside `.group(API_PREFIX, ...)`.
6. Writes need auth: put `.use(requireAuth)` before write routes; read `auth.user.id` from context.
   Reads are currently open (match existing modules unless told otherwise).
7. Lists: accept `page/pageSize/sort/order/search` (strings), run `normalizePagination` from `@sts/shared`,
   return `{ data, meta: { page, pageSize, total } }`.
8. Seed (if useful): extend `src/db/seed/seed.ts`, keep it **idempotent** (upsert / check by code).
9. Update `AGENT.md` (schema/modules line) in the same commit.

## Domain rules to respect

- Zone ↔ contractor is many-to-many; never add `zones.contractor_id`.
- Daily-report style data is keyed by (project, contractor, work_date[, zone]); think about the unique constraint.
- Keep WBS / BLD.CODE / seed-zone codes as separate columns or a mapping table (see `sts-domain`).
- Files (photos, drone images) go through `StorageService` (`@/shared/storage`) — MinIO holds bytes, Postgres holds
  metadata. Modules never import the minio client.

## Pitfalls

- `errorPlugin` must check `instanceof AppError` before Elysia validation errors (else 409 becomes 400).
- Imports use `.js` suffix and `@/` alias. `bun --filter` must run from repo root.
- Verify with `sts-verify` (typecheck + curl the endpoint, including one error case).
