# STS Monorepo Lint and Format Foundation Implementation Plan

> **For agentic workers:** Use the `superpowers:executing-plans` skill to implement this plan task by task.

**Goal:** Add a small, repository-wide ESLint Flat Config and Prettier workflow while keeping TypeScript typecheck separate and preserving application behavior.

**Architecture:** One root `eslint.config.js` uses the existing ESM package mode and file-scoped browser/Bun globals. Prettier owns formatting independently; TypeScript continues to own type and unused-symbol checking through existing workspace scripts.

**Tech Stack:** Bun workspaces, ESLint Flat Config, typescript-eslint, React Hooks/Refresh plugins, Prettier, existing TypeScript configs.

**Spec:** User-provided lint/format requirements in the current conversation.

## Global Constraints

- Do not change application behavior, business logic, routing, API contracts, or schemas.
- Keep one root ESLint config; do not add legacy `.eslintrc` files or redundant workspace configs.
- Do not use `eslint-plugin-prettier`; keep lint and formatting separate.
- Do not add plugins outside the requested minimal set.
- Preserve existing double-quote, semicolon, and two-space source style; use `endOfLine: auto` because tracked files are LF while working copies are mixed/CRLF.
- Ignore generated build/dependency output; do not blanket-ignore Drizzle migrations or rewrite migration SQL.
- Keep the existing root Docker-backed `dev` script and the current worktree changes intact.

## Review Focus

1. Bun globals must apply to API, env-package, and Bun test files without leaking browser globals into them; `bun run lint` exercises these scopes.
2. Browser globals and React rules must apply only to `apps/web/src`; lint the API and shared packages to catch accidental scope leakage.
3. Existing `Elysia<any, ...>` usage is a known generic boundary; do not turn `no-explicit-any` into a blocking repository refactor.
4. TypeScript already has `noUnusedLocals` and `noUnusedParameters`; avoid duplicate TS unused-variable errors and preserve `_` parameter conventions.
5. Prettier must preserve per-file line endings and leave generated Drizzle metadata snapshots and binary assets unchanged; review `git diff --stat` and the complete formatting diff.

## Plan

### Task 1: Add root ESLint Flat Config

**Files:** `package.json`, `bun.lock`, create `eslint.config.js`.

- Add only `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, and `eslint-config-prettier` as root dev dependencies when absent.
- Extend the recommended JS and TypeScript baselines; keep TypeScript type-aware linting off because `tsc` is the separate type layer.
- Apply Bun/Node globals to API, env, test, and tool config files; apply browser globals and Hooks/Refresh rules only to web source.
- Use JS unused-variable reporting only for JS files; defer TS unused-symbol checking to existing compiler flags. Keep `no-explicit-any` non-blocking for the audited Elysia generic.
- Ignore node_modules, dist/build/coverage, `.vite`, and generated Drizzle directories as appropriate.

### Task 2: Add Prettier and format baseline

**Files:** create `.prettierrc.json`, create `.prettierignore`, format supported repository files.

- Match existing double quotes, semicolons, trailing commas, and two-space indentation; preserve each file's existing line-ending convention.
- Ignore generated Drizzle metadata snapshots and binary assets, but leave committed SQL migrations reviewable.
- Run format/check, inspect the diff size, and adjust configuration before accepting broad formatting churn.

### Task 3: Wire root quality scripts and concise docs

**Files:** `package.json`, `README.md`, `AGENT.md`.

- Set `lint`, `lint:fix`, `format`, and `format:check`; preserve the existing `typecheck` script.
- Add `check` in the order lint → format:check → typecheck.
- Document the root commands concisely; do not add workspace scripts or CI without a demonstrated need.

### Task 4: Baseline fixes and verification

**Files:** only source files with genuine lint failures; avoid business refactors.

- Run `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run check`, and `bun run build`.
- Fix safe baseline issues or narrow inappropriate rules; do not scatter disables.
- Confirm frozen-lockfile install and inspect `git diff --check`, generated/migration diffs, and overall formatting churn.
