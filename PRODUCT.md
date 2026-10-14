# PRODUCT.md — STS Daily Report (EPS)

## What this is

Owner-side daily-report platform for the **STS 9.9 MW Biomass Power Plant** construction
project (doc prefix `STSBPP`). EPS (PM/QAQC) collects one clean daily data source from every
contractor — replacing free-text LINE messages and paper "Daily Request & Report" forms —
and turns it into dashboards, exports and a shared site plan.

## Users

- **Contractor field staff** ( contractors ผู้รับเหมา ): one shared account per company, on a phone at
  the workface. Fills the morning check-in (manpower, weather, machinery, permits, buildings)
  and the evening check-out (OT, progress vs plan, photos, signature, tomorrow's requests).
- **EPS site team** (`eps_site`): reviews submissions, logs safety/rain/line-walk, watches the
  daily coordination map, exports PDF/CSV evidence.
- **EPS administrators** (`eps_admin`): user approvals/linking, contractors registry, zones,
  site-plan config, colour/lock control over the coordination map.

## Surfaces (and the mode each one plays)

| Surface | Mode | Notes |
|---|---|---|
| `/field`, `/field/report`, `/field/coordination` | Operate (mobile-first) | Contractor phone flow; bottom-nav shell; offline-ish resilience |
| `/daily-reports`, `/today-requests`, `/manpower`, `/safety`, `/qaqc` | Operate | EPS review + dashboards; desktop-dense |
| `/site-coordination`, `/site-plan` | Operate (canvas) | Konva map editing; Canva-style direct manipulation |
| `/admin/users`, `/contractors`, `/site-plan/config` | Operate (admin) | Registries and configuration |
| Print pages (`/daily-reports/print`, `/…/work-done/print`, `/…/history/print`, `/safety/report`, `/site-coordination/report`) | Read (paper) | Standalone A4/A3 documents; own CSS allowed |
| `/login`, `/reset-password` | Persuade-lite (auth) | One job: get in |

## Product truths that the UI must keep

- Morning and evening shifts are **independent**; the evening never waits for the morning.
- "Tomorrow's requests" (QAQC, machinery, road, permits) are made the evening before, keyed by
  `target_date` — they are the plan the next day is checked against.
- Numbers are the point: man-day, NMH, plan % vs actual %, headcount vs permit headcount.
  Legibility beats decoration; empty/loading/error states must never lie about data.
- Three location schemes coexist (repo groups 1.1–6.5, Conzol WBS 000–034, BLD.CODE A–O).
  Never merge them silently; never invent a fourth.

## Language policy (decided)

- **English for controls**: buttons, tabs, chips-as-actions, field labels, pickers
  ("From/To/Today/This week/This month"), table column heads, dialog action buttons, page titles.
- **Thai for explanation**: subtitles, helper text, hints, empty/error descriptions, toasts,
  inline callouts — wherever a sentence helps a Thai-speaking user understand.
- Mixed content (Thai values inside EN-labelled tables) is expected and correct.

## Technical constraints

- React 19 + Vite + MUI 7 (MUI X 8) + TanStack Query 5 + RHF/Zod; Elysia + Drizzle + Postgres API.
- One theme (`apps/web/src/app/theme`); tokens are the only colour source. No new libraries
  without asking; sonner is the only toast system.
- Mobile Safari/Chrome on Android mid-range phones is the floor for `/field` surfaces.

## Non-goals

- No marketing pages, no second visual brand, no dark mode (yet).
- No offline write queue — the API is the source of truth; optimistic UI only where already built.
