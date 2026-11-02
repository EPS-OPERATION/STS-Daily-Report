# Auth v2 implementation and verification

Date: 2026-10-11. Branch: `feature/auth-v2` from `dev-got`.

Implementation is present. Browser acceptance remains pending because the browser tool rejects
`http://localhost:5173` with a saved permission block, including after the user approved access and
reported changing the setting. No alternate browser surface or permission workaround was used.
No commit or push was performed. Existing report/seed cleanup work was preserved.

## Changes

- API authentication: `apps/api/src/auth/` extends existing cookies/sessions with Argon2id password login,
  pending contractor registration, public contractor options, and atomic one-time password reset.
- EPS administration: `apps/api/src/modules/users/` and `middleware/require-eps.ts` implement paginated
  listing, transactional approval/membership, rejection, and reset-link issuance.
- Schema: `user.schema.ts`, `password-reset.schema.ts`, `auth-rate-limit.schema.ts`; generated migration
  `0016_elite_turbo.sql`, `meta/0016_snapshot.json`, and journal entry.
- Security: seeded identities alone qualify for demo login; password attempts never fall back to demo;
  reset links are SHA-256 hashed, expire after 60 minutes, and invalidate previous links and sessions;
  credential-bearing validation errors are sanitized; auth/admin responses use `Cache-Control: no-store`.
- Frontend: `features/auth/`, new `features/users/`, `/login` tabs, `/reset-password`, `/admin/users`, EPS
  sidebar/command-palette entries, and unlinked-company states in `/field` and `/field/report`.
- Session transitions cancel and clear private query caches. The initial HTML applies `no-referrer`.
- Local seed fills missing credentials only; bootstrap script initializes a passwordless seeded EPS
  account without a default production password and cannot overwrite existing credentials.
- `packages/env` supports password production, optional demo mode, and a canonical `WEB_URL`.
- API dev/migrate/seed commands explicitly load the root `.env` through workspace execution.
- Default ports restored as explicitly requested: web 5173, API 3000, PostgreSQL 5432, MinIO 9000/9001.
  Docker containers were recreated with the same named data volumes; the local gitignored `.env`
  connection ports were updated without exposing or changing credentials.
- README §15, AGENT.md, and `.env.example` document these flows. AGENT.md remains 99 lines.

## Commands and observed results

`bun db:generate` generated `0016_elite_turbo` with 29 tables and exited 0. The SQL, snapshot, and journal
were reviewed; token-hash uniqueness supplies its lookup index, with a separate user index for invalidation.

`bun db:migrate` initially failed because workspace execution did not load `DATABASE_URL` from the root
`.env`. After fixing the API scripts it printed `migrations applied` and exited 0. Re-running after the
port switch also exited 0, with expected notices that the Drizzle schema/table already exist.

`bun db:seed` ran twice successfully, exit 0:

```text
seed ok: 1 project, 23 site contractors, 21 zones, 1 site plan, 16 areas, 15 buildings + markers — users: eps/contractor/trial/contractor01-03 (dev logins), no sample reports
```

`bun --env-file=.env apps/api/scripts/verify-auth-v2-seed.ts` exited 0:

```text
PASS seed preserves all six credential hashes and usernames
```

Final `bun typecheck` exited 0:

```text
@sts/shared typecheck: Exited with code 0
@sts/env typecheck: Exited with code 0
sts-api typecheck: Exited with code 0
sts-web typecheck: Exited with code 0
```

Final `bun test` exited 0:

```text
47 pass
0 fail
84 expect() calls
Ran 47 tests across 5 files.
```

Final `bun run build` exited 0 for API and web. API bundled 678 modules, 2.39 MB. Web transformed 2536
modules and produced a 2,994.34 kB JavaScript chunk (795.43 kB gzip). Vite warned that chunks exceed 500 kB;
bundle splitting was not part of this authentication change.

`git diff --check` exited 0. Git reported its normal LF-to-CRLF notice for the migration journal.
The Impeccable mechanical detector returned `[]` for the changed auth/users UI. This is a static check,
not browser acceptance.

## Actual local API acceptance

With `bun dev:api` running on port 3000, the final command
`bun --env-file=.env apps/api/scripts/verify-auth-v2.ts` exited 0 and printed:

```text
PASS public config: 200
PASS public contractor options: 200
PASS register: 201
PASS duplicate email: 409
PASS duplicate username: 409
PASS missing company: 400
PASS both company choices: 400
PASS invalid email: 400
PASS invalid username: 400
PASS short password: 400
PASS credential-safe validation: 400
PASS unknown contractor: 400
PASS pending login: 403
PASS pending wrong password: 401
PASS legacy trial demo login: 201
PASS seeded EPS password login: 201
PASS approve: 200
PASS repeat approval: 409
PASS approved email login: 201
PASS session me: 200
PASS username login: 201
PASS email payload with password: 201
PASS wrong password never selects demo: 401
PASS wrong password: 401
PASS unknown login: 401
PASS password omission cannot bypass: 401
PASS non-EPS user list: 403
PASS non-EPS approval: 403
PASS non-EPS reset: 403
PASS unauthenticated users list: 401
PASS Other registration: 201
PASS Other approval: 200
PASS Other approved login: 201
PASS second registration: 201
PASS reject whitespace: 400
PASS reject: 200
PASS rejected login: 403
PASS rejected reset denied: 409
PASS paginated EPS list: 200
PASS issue first reset link: 200
PASS replace reset link: 200
PASS superseded token: 400
PASS concurrent reset: exactly one 200 and one 400
PASS used token: 400
PASS old session revoked: 401
PASS old password rejected: 401
PASS new password login: 201
PASS expired token: 400
PASS bad token: 400
PASS concurrent decision registration: 201
PASS concurrent decision: exactly one 200 and one 409
PASS normalized registration: 201
PASS login throttling: 429
AUTH V2: 53 checks passed
```

The script also asserts: exact Thai pending/rejected messages; identical wrong-password/nonexistent-account
errors; session cookie existence; no registration membership; exactly one approval membership; no Other
membership with company name retained; no password hash in user-list output; hashed reset token storage;
and correct pagination totals. Fixtures use unique QA identities and are removed in `finally`, including
their cascaded sessions/tokens and uniquely owned rate-limit keys. Shared peer counters are retained.

## Actual production-mode API acceptance on the local database

The API was temporarily started on the standard port 3000 with process-only environment overrides:

```powershell
$env:NODE_ENV='production'
$env:AUTH_PROVIDER='password'
$env:ALLOW_DEMO_LOGIN='false'
$env:API_PORT='3000'
bun --env-file=.env apps/api/src/index.ts
```

`bun --env-file=.env apps/api/scripts/verify-auth-v2-production.ts` exited 0: `PRODUCTION AUTH V2: 17 checks passed`.
It covers public configuration/options/registration/reset, protected reads, disabled demo login, secure
HTTP-only cookies, approval/password login, no-store reset responses, session revocation, and EPS bootstrap
initialization/refusal to overwrite credentials. These were local production-mode tests; no hosted deployment
or production database was changed. Temporary production-mode API processes were stopped and development
API service was restored on port 3000.

`docker compose up -d postgres minio` successfully recreated the containers with the existing volumes.
`docker inspect --format '{{.Name}} {{.State.Health.Status}}' sts-postgres sts-minio` returned:

```text
/sts-postgres healthy
/sts-minio healthy
```

Listening ports were confirmed as 3000, 5173, 5432, 9000, and 9001; no test API remained on 3001.

## Remaining browser acceptance

These steps are required before claiming full UI acceptance:

1. Register through Create account, validate confirmation/mismatch/company errors, and observe the pending panel.
2. Sign in as local EPS (`eps`, development password `sts123456`), open `/admin/users`, approve with the intended mapping.
3. Sign in by the approved username and verify the field app; verify an approved Other user sees the unlinked state.
4. Generate/copy a reset link, complete the reset form, verify success and subsequent sign-in, and verify an expired link error.
5. Inspect desktop and mobile widths for wrapping, scroll, focus, and reachable controls.

Browser automation rejected this local origin three times; the last rejection states a saved user permission
preference blocks access. No rendered screenshots or live UI interactions were obtained.
