# CLAUDE.md — STS Daily Report

Construction daily-report + dashboard web app for the **STS 9.9 MW Biomass Power Plant** (doc prefix `STSBPP`).
EPS is the owner-side PM/QAQC team; contractors (ผู้รับเหมา) submit daily reports. The goal is one clean
data source that feeds dashboards — replacing free-text LINE messages and paper "Daily Request & Report" forms.

@AGENT.md
@PROJECT_WORKFLOW.md

## Hard rules

1. **Git**: work only on `improvement/daily-report`. Never commit/merge/rebase/reset/push `main` or `dev`, never
   `--force`, never open or merge a PR unless asked. Rebase conflict → STOP and ask. Details: `PROJECT_WORKFLOW.md`.
2. **Improve, don't rebuild**: preserve existing behaviour unless the task says to change it.
3. **Keep AGENT.md true**: any change to files/commands/env/schema/architecture updates `AGENT.md` in the same commit
   (it must stay < 100 lines; long material goes to README or a skill).
4. **Copy the reference pattern**: backend `apps/api/src/modules/contractors`, frontend `apps/web/src/features/contractors`.
5. **Verify before claiming done**: `bun typecheck` must pass; for API changes hit the endpoint; for UI changes open the page.
   There are no tests or lint yet — say so instead of implying coverage.
6. Never commit `.env` or secrets. Never use `local-email` auth outside development.

## Domain essentials (full detail: `sts-domain` skill)

- Daily report = contractor × project × date with two **independent** shifts. Morning: hours, weather, headcount by
  position (primary) = nationality/sex, building allocation. Evening: accident, OT, actual vs plan, photos, signature
  and **tomorrow's requests** (QAQC, machinery, road usage, permits — keyed by `target_date`, made the evening before).
- A **zone holds many contractors**; one `site_activities` row = one contractor × one zone × one calendar day.
- Three location schemes coexist and do NOT map 1:1: repo seed groups `1.1–6.5`, Conzol WBS `000–034`,
  drawing BLD.CODE `A–O` (25 buildings). WBS 26–34 are system-wide (no building). Never silently merge them.
- Contractors have several aliases (doc code / Conzol code / filename code). Store aliases, don't pick one.
- Thai reports use Buddhist-era dates (`15/09/69` = 2026-09-15). Store Gregorian `DATE`, display either.
- Cross-checks the business cares about: permit headcount ≤ manpower, machines vs permit types,
  plan % vs actual % per activity (countermeasure required when behind), report date vs document code date.
- Metrics: **Man-day** = headcount per day, cumulative. **NMH** (man-hours) = headcount × hours, cumulative.

## Skills (project, in `.claude/skills/`) — index in `SKILLS.md`

| Skill | Use when |
|---|---|
| `sts-domain` | Modelling reports, forms, dashboards, WBS/zones, contractors, safety metrics |
| `sts-api-module` | Adding/changing an Elysia + Drizzle module, table, or migration |
| `sts-web-feature` | Adding/changing a React feature, page, form, grid, or dashboard widget |
| `sts-verify` | Before saying work is done; running the stack locally; debugging ports/docker/db |
| `sts-git-safety` | Any git command that commits, rebases, pushes, or touches another branch |

## Sources of truth outside the repo

- Requirements deck (Canva `DAHVPjBav2I`) → exported as `..\STS Daily Report (1).pdf` (Canva URL is 403 to fetch).
- Real contractor reports → `..\Daily Report\` (EPS form R003/20260702). HTML mockups → `..\*.html`.
- Older prototype with a richer `daily_reports` schema → `..\eps-daily-report-foundation` (reference only).

## Style

- Replies to the user may be Thai or English — match the user. Code, identifiers, commits: English.
- `AGENT.md` is written in Thai+English shorthand; keep that style when editing it.
