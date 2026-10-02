# SKILLS.md — project skills for STS Daily Report

Claude Code skills live in `.claude/skills/<name>/SKILL.md` and load automatically when their description matches
the task (or call them by name, e.g. `/sts-domain`). Other agents (Codex, Cursor, …) can read the same files directly.

| Skill | Purpose | Use when |
|---|---|---|
| [sts-domain](.claude/skills/sts-domain/SKILL.md) | Business knowledge from the requirements deck and real reports: actors, report fields, permits, manpower, WBS/zone/BLD.CODE schemes, contractor aliases, doc-number grammar, BE dates, NMH/man-day, requested dashboards | Designing tables, forms, validations, seed data, dashboards |
| [sts-api-module](.claude/skills/sts-api-module/SKILL.md) | Elysia + Drizzle module recipe (schema → migration → repository → service → route → mount) | New table, endpoint, or migration |
| [sts-web-feature](.claude/skills/sts-web-feature/SKILL.md) | React feature recipe and UI rules (Query keys, RHF+Zod, MUI theme, DataGrid, mobile field screens) | New page, form, grid, chart, or route |
| [impeccable](.claude/skills/impeccable/SKILL.md) | Frontend craft & UX/UI design director: typography, colors, layout, Polish/Critique/Audit/Shape playbooks, EPS design system tokens in `DESIGN.md` | Any frontend UI/UX work, design polish, dashboard aesthetics, critique |
| [web-design-guidelines](.claude/skills/web-design-guidelines/SKILL.md) | Web design principles, layout hierarchy, cognitive load, user feedback | UI review and visual balance |
| [vercel-react-best-practices](.claude/skills/vercel-react-best-practices/SKILL.md) | Modern React patterns, component optimization, bundle size | React component architecture |
| [sts-verify](.claude/skills/sts-verify/SKILL.md) | Typecheck/build, run the stack, curl and browser checks, known env/port pitfalls | Before saying "done"; stack won't start |
| [sts-git-safety](.claude/skills/sts-git-safety/SKILL.md) | Branch rules from `PROJECT_WORKFLOW.md` as a checklist | Any git write operation |

Typical flow for a new domain (e.g. manpower, work permits, QAQC requests, materials, drone photos):
`sts-domain` → `sts-api-module` → `sts-web-feature` / `impeccable` → `sts-verify` → `sts-git-safety` (only if asked to commit/push).

Maintenance: when a recipe or rule changes in code, update the matching skill in the same commit. Keep each
`SKILL.md` short; put facts that every task needs in `CLAUDE.md` / `AGENT.md` instead.
