---
name: sts-web-feature
description: Recipe and UI rules for adding or changing a frontend feature in apps/web of STS Daily Report (React 19, Vite, MUI 7 / MUI X 8, TanStack Query 5, React Hook Form + Zod, Konva site plan) - feature folder layout, query keys, forms, DataGrid, theme tokens, icons, mobile field screens. Use for any new page, form, grid, dashboard widget or route.
---

# Add / change a web feature

Reference: `apps/web/src/features/contractors/`. Site plan (Konva, drill-down) lives in `features/site-plan/`.

## Layout

```
features/<domain>/
  api/<domain>.api.ts      # calls `http` from @/services/http/client.js — never raw fetch in components
  api/<domain>.keys.ts     # <domain>Keys.all / lists() / list(filters) / details() / detail(id)
  hooks/use-<x>.ts         # useQuery / useMutation; mutations invalidate <domain>Keys.lists()
  schemas/<domain>.schema.ts  # zod form schema
  types/<domain>.types.ts
  components/*.tsx
  pages/<x>-page.tsx       # route screens live INSIDE the feature (there is no top-level pages/ dir)
  index.ts                 # barrel: types, keys, api, hooks, components, schema (not the pages)
# route: add `lazy: page(() => import("@/features/<domain>/pages/<x>-page.js"), "XPage")` in app/router/index.tsx
# (import the page by file path, never via the barrel, so it stays its own chunk)
```

Replace the `PlaceholderPage` route when a placeholder domain (manpower, work-permits, qaqc, materials, progress,
reports) becomes real. Register navigation icons in `app/icons/navigation-icons.ts` and palette commands in
`app/command-palette/command-registry.ts` (never destructive commands).

## Rules

- Cross-feature imports should go through the other feature's barrel (the app shell and router deep-import on purpose to keep the entry bundle small; `bun check:arch` only enforces no cycles), and arrows are one-way (leaf features such as
  buildings/contractors/qaqc/report-summaries never import daily-reports). Report query keys share the root
  `["daily-reports"]` from `lib/report-query-keys.ts` so one `useInvalidateReports()` refreshes them all.
- Server state = TanStack Query only. No server data in Context, no global store. Project selection comes from
  `features/projects` `ProjectProvider`.
- Forms: React Hook Form + `zodResolver`. Errors via MUI `Alert`/`Dialog`/Snackbar, never `alert()`.
- Styling: theme tokens from `app/theme/` only (navy `#0B4D8B`, Inter + Noto Sans Thai, radius 6/8/10,
  border over shadow). Reuse `components/ui/` (PageHeader, KpiCard, StatusChip, EmptyState).
- Pages stay thin (<~400 lines): state, URL params and derived data go in a `hooks/use-<page>.ts` hook returning one object; big JSX blocks become `components/*.tsx` taking `ed` (that hook's return type). Helper components never live inside a page file.
- Shared UI first: `Panel` (bordered section), `Frame` (bordered list/table wrapper), `EmptySection`/`EmptyState`, `FormDialog` (form dialogs) / `ConfirmDialog`, `BlockSkeleton`, `components/print/PrintSheet` for print pages; never hand-roll these per feature. Colours outside `sx` come from `app/theme/tokens.ts`, never hex.
- Status display goes through `StatusChip` (tones active/attention/blocked/idle). QAQC icon = `FactCheckOutlined`.
  Icons are Outlined (only ArrowBack/Forward/MoreVert/MoreHoriz stay filled).
- MUI v7 Grid: `size={{ xs: 12, md: 6 }}`. DataGrid theme needs
  `import type {} from "@mui/x-data-grid/themeAugmentation"`; lists should be server-paginated.
- Charts: `@mui/x-charts`. Dates: `dayjs`; the business reads Thai BE dates — format at display time only.
- Field/contractor screens (`/field`, `/evening-report`) are mobile-first: large touch targets, stepper forms,
  dropdowns for recurring values, pre-fill from the morning report. The site-plan map is view-only on mobile.
- Mock data in `src/mock/` is only for domains with no backend yet — delete the mock usage when the API lands.
- Files kebab-case, components PascalCase, imports with `.js` suffix and `@/` alias. Web never imports from `apps/api`.

## UX priorities from EPS (see `sts-domain`)

Site dashboard answers "what do I do today → what do I prepare tomorrow → what did I send to QAQC → what is stuck".
Tomorrow Plan is the most prominent block; Action Required items show time, location and the blocking reason.

## Done means

`bun typecheck` passes, page opened in the browser (`bun dev`, http://localhost:5173), happy path + one error/empty
state checked, `AGENT.md` updated if screens/routes changed. Use `sts-verify`.
