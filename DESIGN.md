---
name: EPS Daily Report
description: A utilitarian site-reporting tool for construction foremen and admins, built for legibility over decoration.
colors:
  primary: "#0B4D8B"
  primary-dark: "#083761"
  primary-light: "#EAF3FC"
  navy: "#123E6B"
  navy-dark: "#0A2547"
  surface: "#FFFFFF"
  page: "#F6F7F9"
  ink: "#18212F"
  ink-muted: "#667085"
  ink-disabled: "#98A2B3"
  hairline: "#E4E7EC"
  info: "#2787FF"
  success: "#16A34A"
  warning: "#F59E0B"
  error: "#DC2626"
  print-header-tint: "#DBE9F6"
typography:
  stack: "Inter, Sarabun, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif"
  page-title:
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
  section-title:
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  metric:
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  button: "6px"
  input: "8px"
  card: "10px"
  dialog: "12px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.button}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.primary}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.button}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "#FFFFFF"
    rounded: "{rounded.button}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.input}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.card}"
    padding: "16px–20px"
  badge:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: EPS Daily Report

> Source of truth = the code. If this file and `apps/web/src/app/theme/*` disagree, the code
> wins and this file gets fixed in the same commit. Tokens below mirror
> `palette.ts` / `typography.ts` / `components.ts`.

## Overview

**Creative North Star: "The Site Foreman's Clipboard".**

This is used by someone standing in direct sun with dusty gloves, and by an EPS engineer
scanning a week of numbers before a meeting. Every decision follows from those two scenes:
high contrast over subtlety, structure carried by borders and surface steps rather than
shadows, one working colour (navy blue) spent deliberately, and numbers that are readable
at arm's length. Nothing is decorative; every colour, weight and radius exists to make a
number or a status legible fast.

**Key characteristics**

- Flat by default — 1px `divider` borders and surface steps carry structure.
- Shadows only on genuinely floating surfaces: dialog, drawer, menu, popover, tooltip, toast.
- Status never relies on colour alone — icon + label + tone (see `StatusChip`).
- Controls speak English; explanations speak Thai (see Language).
- Minimum 40px controls (`sizeMedium` 40, `sizeLarge` 44); form fields default to `size="small"`.

## Colors

All colour comes from `apps/web/src/app/theme/palette.ts` via MUI tokens. Components must use
theme tokens — never hex/rgb literals. The only sanctioned literal colours are:

1. artwork inside a single component file (weather icons, the coordinate canvas),
2. the standalone print surface (see Print), where values mirror the tokens above 1:1.

- **Primary `#0B4D8B`** — brand and the only primary-action colour (buttons, active states,
  focus rings). `dark #083761` for hover/pressed, `light #EAF3FC` for selected surfaces.
- **Navy `#123E6B` / `navy.dark #0A2547`** — the sidebar chrome and hero cards (field, home).
  `navy.dark` text on light backgrounds is allowed for headings on hero surfaces.
- **Info `#2787FF`** — informational accents, the sidebar active bar, map selection.
- **Semantic**: success `#16A34A`, warning `#F59E0B` (dark `#B45309` for text), error `#DC2626`.
  Warning-as-text always uses `warning.dark`; fills use `warning.main`.
- **Grey scale 50–900** — from `F9FAFB` (subtle fills) to `101828` (tooltip background).
- **Text**: `#18212F` primary, `#667085` secondary, `#98A2B3` disabled. `divider #E4E7EC`.
- **Charts** use `chart-palette.ts` only (fixed series, `CHART_OTHER` for the tail).

**Rules**

- No raw hex in components. If a one-off colour feels necessary, add a token instead.
- Contractor identity colours (`COORDINATION_COLORS`, chip dots) are data, not theme — stored
  per contractor and always paired with the contractor code, never colour-only.

## Typography

**One family: Inter** (with Sarabun for Thai glyph coverage). Hierarchy comes from size and
weight only. Weight scale is 400 / 600 / 700 — nothing heavier.

| Role | Variant | Size / weight | Use |
|---|---|---|---|
| Page title | `h3` | 28 / 700 | `PageHeader` only |
| Section/card title | `h5` | 18 / 600 | panel, card and section headers |
| Dialog/sub-section title | `h6` | 16 / 600 | nested blocks, dialog titles |
| Body | `body1` | 16 / 400 | running text, form values |
| Dense body | `body2` | 15 / 400 | lists, table cells |
| Small label | `subtitle1` | 15 / 500 | metadata lines |
| Label | `subtitle2` | 14 / 600 | field labels, nav items, chips |
| Caption | `caption` | 15 / 400 | hints, timestamps, helper text |
| Overline | `overline` | 12 / 700 caps | group eyebrows |
| Metric | `metric` | 30 / 700 | KPI values (`KpiCard`), nothing else |

**Rules**

- Numbers that are the point use `metric` (KPI) or `h5`-with-tabular-nums (inline figures).
  Never `fontWeight: 800` — the scale stops at 700.
- `text.secondary` for supporting copy, `text.disabled` only for disabled state.

## Layout & spacing

- Content area: `AppLayout` `<main>` padding `{ xs: 2, md: 3 }`, background `page #F6F7F9`.
  Field surfaces additionally cap width (`480/960` home, `520/760` report) — those caps are part
  of the field design, not drift.
- Spacing scale is MUI's 8px grid only: `0.5 / 1 / 1.5 / 2 / 2.5 / 3` (4…24px) plus `py: 10`
  for standalone full-page states in print surfaces. No 1.25 / 2.25 / 0.75 containers; use the
  nearest step.
- Page rhythm: `PageHeader` `mb: 3`; blocks under it stack at `spacing={2.5}`; alerts `mb: 2`.
- Card interior padding: `p: 2` for dense cards (dialogs, tables, nav lists), `p: 2.5` for
  content cards (dashboard, forms, summaries), `p: 1.5` only for compact toolbars.

## Elevation & depth

Flat by default. Structure = 1px `divider` border + surface step (`page` → `surface`).
Shadows exist only on floating layers and come from the theme (no hand-written `boxShadow`):

- Dialog paper: radius 12, `0 12px 32px rgba(16,24,40,0.18)`
- Drawer: matching softer shadow; Menu/Popover: 10px radius + border + soft shadow
- Tooltip: ink `#101828`; Toaster (sonner) bottom-right.

**Rule**: an ordinary card, panel or form never gets a shadow. If something must stand out,
raise its border colour or step the surface, don't add shadow.

## Shapes

**The radius ladder** — one value per class of surface, from the theme (`shape.borderRadius: 8`):

- `6px` — buttons, chips (`MuiButton`, `MuiChip`)
- `8px` — inputs, icon buttons, alert boxes, skeleton rounded
- `10px` — cards, papers, menus, popovers, data grid
- `12px` — dialogs
- `999px` — pills and avatar-ish full-round elements only

No `borderRadius: 1.5` / `2.5` / `"8px"` strings / side-specific 16px one-offs. Fractions of
the theme multiplier are drift; round to the ladder.

## Components

### Headers

- Every routed app page starts with `PageHeader` (title `h3`, optional Thai subtitle,
  optional actions). Field surfaces use their navy hero card instead — that is the sanctioned
  second header family, and only for `/field*`.
- Filters live in `PageHeader` actions: `DateRangeFields` + `ContractorFilterPopover` (+ page
  view toggles). Pages that embed a table inside a card may keep their filters inside that card.

### Buttons

- Theme default is `contained` (primary). Secondary action in a pair = `variant="outlined"`
  (or `color="inherit"` + `variant="outlined"` for neutral cancel). Text buttons only for
  inline/table actions. Danger = `color="error"` contained.
- Sizes: default (40px) for page actions, `size="small"` for in-card/in-table/toolbar actions.
  Full-width `size="large"` only for the field forms' sticky submit.
- Button labels are English and imperative ("Add", "Save", "Cancel", "Delete").

### Forms

- `TextField` defaults to `size="small" fullWidth`. Validation via RHF helperText; form-level
  problems via one `Alert severity="warning"` above the submit bar; server errors via
  `Alert severity="error"`. Custom controls render their error as caption text in
  `theme.palette.error.main` under the control.
- Sticky submit bar for long forms (`position: sticky; bottom`, border-top, same padding as
  content). Dialogs submit from right-aligned `DialogActions`: Cancel (outlined/inherit) then
  the confirm (contained; `color="error"` for destructive).

### Tables

- Server-paginated registries use MUI X `DataGrid` (admin/users, contractors) — theme already
  disables column menus/resize; do not repeat those props.
- Report-style tables use MUI `Table size="small"`. A standalone table wraps in `TableCard`
  (card + `TableContainer` + optional header row). A table already inside a `Card` keeps that
  card; do not nest cards. No bare bordered boxes.
- Empty table body = one centered `body2` `text.secondary` row with `py: 2`.

### Feedback (decided)

| Situation | Pattern |
|---|---|
| Transient success/failure of an action (save, delete, lock, colour) | `toast` (sonner) — bottom-right, Thai message |
| Contextual, persistent problem (query failed, form invalid, permission) | inline `Alert` on the surface |
| Destructive action | `ConfirmDialog` (MUI dialog, danger button) — never `window.confirm`, never silent |
| Query error on a page | `QueryError` block: `Alert severity="error"` + "Retry" button |

Silent success is not a pattern: if an action changed data, say so with a toast.

### Loading & empty states

- Block loading = `Skeleton variant="rounded"` at the block's real height.
- Refetch on data-heavy pages = thin `LinearProgress` pinned at `top: 64` (sub-1s, no skeleton
  swap). Print surfaces may use `CircularProgress` while preparing the document.
- Empty state = `EmptyState` card for page/section-level blanks; single caption row inside
  tables. Same icon family (Outlined), one Thai sentence + one action when actionable.

### Icons

- `@mui/icons-material` **Outlined** variants only, imported by path
  (`@mui/icons-material/SearchOutlined`). No filled/base variants in UI chrome, no Rounded.
- Exception: illustrative SVGs (weather artwork, logo, Konva map glyphs).

### Print surfaces

Standalone pages keep their own CSS (A4/A3 sheet layout is not app layout), but must share:
the EPS logo asset, header tint `#DBE9F6`, border `#222`, and one `no-print` toolbar pattern.
Brand colours in print mirror the palette (`primary` for rules/accents).

### Navigation

- Sidebar navy with info-accent active bar; collapsible; mobile = temporary drawer.
- Field bottom nav: Home / Report / Plan(/field/coordination) / More (opens the drawer).
- Command palette (Ctrl/Cmd+K) lists only destinations the current role can actually open.

## Language

- **Controls in English**: buttons, tabs, chips-as-actions, field labels, date range labels,
  table headers, dialog actions, page titles.
- **Explanations in Thai**: subtitles, helper text, hints, empty/error copy, toasts, callouts.
- Data values keep their source language (Thai contractor names, Thai work descriptions).

## Do's and Don'ts

**Do**

- Do route every colour, radius and font through the theme; add a token instead of a literal.
- Do reuse: `PageHeader`, `DateRangeFields`, `ContractorFilterPopover`, `KpiCard`, `EmptyState`,
  `StatusChip`, `QueryError`, `ConfirmDialog`, `TableCard`, `Panel`.
- Do keep status = icon + label + tone; colour alone is never the message.
- Do verify with `bun typecheck`, web build, and a look at the page on desktop + phone width.

**Don't**

- Don't hand-write `boxShadow`, `zIndex` beyond the documented sticky/progress/toast ladder,
  or `borderRadius` fractions — use the ladder.
- Don't use filled icons, `fontWeight: 800`, or `window.confirm`.
- Don't leave success silent, errors invisible (every query needs an error branch), or
  destructive actions unconfirmed.
- Don't ship a page whose filters/header/table pattern differs from this document — fix the
  page, or fix the document in the same change.
