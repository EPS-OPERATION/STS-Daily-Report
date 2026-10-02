# GEMINI.md — STS Daily Report

Construction daily-report + dashboard web app for the **STS 9.9 MW Biomass Power Plant** (doc prefix `STSBPP`).
EPS is the owner-side PM/QAQC team; contractors (ผู้รับเหมา) submit daily reports. Goal: one clean data source for
dashboards, replacing LINE messages and paper "Daily Request & Report" forms.

@./AGENT.md
@./PROJECT_WORKFLOW.md

## Hard rules

1. **Git**: work only on `improvement/daily-report`. Never commit/merge/rebase/reset/push `main` or `dev`, never
   `--force`, never open or merge a PR unless asked. Rebase conflict → STOP and ask (`PROJECT_WORKFLOW.md`).
2. **Improve, don't rebuild**: keep existing behaviour unless the task says to change it.
3. **Keep `AGENT.md` true** and under 100 lines: any change to files/commands/env/schema/architecture updates it in the
   same commit.
4. **Copy the reference pattern**: backend `apps/api/src/modules/contractors`, frontend `apps/web/src/features/contractors`.
5. **Verify before claiming done**: `bun typecheck` must pass; hit changed endpoints; open changed pages. There are no
   automated tests or lint yet — say so rather than implying coverage.
6. Never commit `.env` or secrets; `local-email` auth is development-only.

## Domain essentials

- Daily report = one row per contractor × project × date, two independent shifts:
  - **Morning check-in**: hours, weather, headcount **by position** (primary total) = nationality/sex split,
    equipment on site, allocation to the 16 buildings (must sum exactly to the total), read-only list of what was
    requested for today.
  - **Evening check-out**: accident yes/no, OT, actual % vs plan % per building (countermeasure when behind), photos,
    signature, and **tomorrow's requests** (QAQC inspection, machinery booking, road usage, work permits) — requests
    are always made the evening before (17:00 coordination meeting) and keyed by `target_date`.
- A building/zone holds many contractors. Location schemes (seed zones 1.1–6.5, Conzol WBS 000–034, drawing BLD.CODE
  A–O, the 16 buildings) do not map 1:1 — never merge them silently.
- Thai reports use Buddhist-era dates (`15/09/69` = 2026-09-15); store Gregorian `DATE`.
- NMH = headcount × (normal hours + OT); man-day = daily headcount.

## Project skills (plain Markdown — read the relevant file before the task)

| File | Read when |
|---|---|
| `.claude/skills/sts-domain/SKILL.md` | Modelling reports, forms, dashboards, WBS/zones, contractors, safety metrics |
| `.claude/skills/sts-api-module/SKILL.md` | Adding/changing an Elysia + Drizzle module, table or migration |
| `.claude/skills/sts-web-feature/SKILL.md` | Adding/changing a React feature, page, form, grid or dashboard widget |
| `.claude/skills/impeccable/SKILL.md` | Frontend craft & UX/UI design director: typography, colors, layout, Polish/Critique/Audit/Shape playbooks, EPS design system tokens in `DESIGN.md` |
| `.claude/skills/web-design-guidelines/SKILL.md` | Web design principles, layout hierarchy, cognitive load, user feedback |
| `.claude/skills/vercel-react-best-practices/SKILL.md` | Modern React patterns, component optimization, bundle size |
| `.claude/skills/sts-verify/SKILL.md` | Before saying work is done; running the stack; port/docker/db problems |
| `.claude/skills/sts-git-safety/SKILL.md` | Any git command that commits, rebases, pushes or touches another branch |

Index: `SKILLS.md`. Claude Code uses `CLAUDE.md` with the same content — keep both files in sync when rules change.

## Sources outside the repo

- Requirements deck (Canva `DAHVPjBav2I`) → `..\STS Daily Report (1).pdf`.
- Real contractor reports → `..\Daily Report\`. HTML mockups → `..\*.html` (24/36 daily report, 33 review queue,
  34 master data, dashboard_v9).

## Style

- Reply in the user's language (Thai or English). Code, identifiers, commits: English.
- `AGENT.md` uses Thai+English shorthand; keep that style when editing it.
