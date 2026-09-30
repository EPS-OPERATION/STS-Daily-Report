---
name: sts-verify
description: How to run and verify STS Daily Report locally before claiming work is done - bun typecheck/build, docker compose (postgres + minio), migrations, seed, dev servers, curl checks against /api/v1, dev login, and known port/env pitfalls. Use before reporting completion, and when the stack will not start.
---

# Verify / run locally

There are **no automated tests and no lint** yet (`bun lint` is a stub). Say that plainly; do not imply coverage.

## Minimum gate (every change)

```sh
bun typecheck          # all workspaces; must be clean
bun run build          # when touching build config, Dockerfiles or imports across packages
```

## Run the stack

```sh
cp .env.example .env   # only if .env is missing — never overwrite an existing .env
bun install
bun docker:up          # postgres 5432, minio 9000/9001
bun db:migrate
bun db:seed            # idempotent
bun dev                # api :3000, web :5173
```

Full app in containers: `docker compose --profile app up -d --build`.

## API checks

```sh
curl -s localhost:3000/health
curl -s "localhost:3000/api/v1/contractors?page=1&pageSize=5"
# writes need a session cookie (dev only, AUTH_PROVIDER=local-email, no password):
curl -s -c /tmp/sts.jar -H 'Content-Type: application/json' \
  -d '{"email":"contractor@sts.local"}' localhost:3000/api/v1/auth/login
curl -s -b /tmp/sts.jar localhost:3000/api/v1/auth/me
```

Check at least one failure path too (404 / 409 / 400 envelope `{error:{code,message,details}}`).
If the login body shape differs, read `apps/api/src/auth/auth.schema.ts` rather than guessing.

## UI checks

Open http://localhost:5173 (login `contractor@sts.local`), visit the changed page, test happy path and an
empty/error state, and a phone-width viewport for `/field`, `/evening-report`, `/site-plan`.
The `webapp-testing` skill (Playwright) can script this and take screenshots.

## Pitfalls seen in this repo

- Ports 3000/5432/9000 are often used by other local projects — check before blaming the code; use a compose
  override **outside** the repo with `ports: !override`.
- Bun auto-loads root `.env`; real env vars override it. `bun --filter` must run from repo root.
- `minio/minio:latest` is gone from Docker Hub — keep the pinned tag.
- `packages/env` needs `@types/bun` or `process` fails typecheck.
