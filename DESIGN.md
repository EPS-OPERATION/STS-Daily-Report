---
name: EPS Daily Report
description: A utilitarian site-reporting tool for construction foremen and admins, built for legibility over decoration.
colors:
  pure-white: "oklch(1 0 0)"
  warm-ivory: "oklch(0.965 0.01 130)"
  warm-ivory-deep: "oklch(0.935 0.014 130)"
  charcoal-ink: "oklch(0.25 0.032 130)"
  dust-gray: "oklch(0.5 0.022 130)"
  hairline: "oklch(0.875 0.012 130)"
  moss-olive: "oklch(0.48 0.15 132)"
  moss-olive-deep: "oklch(0.415 0.148 132)"
  baked-ember: "oklch(0.6 0.145 48)"
  alert-red: "oklch(0.55 0.19 25)"
  caution-amber-bg: "oklch(0.94 0.06 90)"
  caution-amber-ink: "oklch(0.4 0.08 75)"
  field-green: "oklch(0.5 0.15 145)"
typography:
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "6px"
  default: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.moss-olive}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.moss-olive-deep}"
  button-secondary:
    backgroundColor: "{colors.warm-ivory}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.alert-red}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  badge:
    backgroundColor: "{colors.warm-ivory-deep}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: EPS Daily Report

## Overview

**Creative North Star: "The Site Foreman's Clipboard"**

This is a tool for someone standing in direct midday sun with dusty gloves, filling in numbers before the next task starts. Every decision follows from that scene: high-contrast solid fills over subtlety, 44px minimum tap targets, one accent color spent sparingly so it still means something when it appears. The palette reads as construction-site material — sun-bleached ivory ground, moss-olive as the working brand color, baked-ember held in reserve for the moments that need to be noticed (priority, warnings, the rare accent action). Nothing here is decorative; every color, weight, and radius exists to make a number or a status legible fast, not to look impressive.

The system is restrained on purpose. A pure-white background carries almost the whole UI; moss-olive is the only color allowed to represent "brand" or a primary action; baked-ember is reserved for `HIGH`-priority and secondary-accent moments so it stays rare enough to still function as a flag. Nothing in the interface is imported from a generic SaaS-dashboard vocabulary — no gradients, no glassmorphism, no soft drop shadows layered on every card.

**Key Characteristics:**
- Flat by default — borders and tonal surface steps carry structure, not shadows
- One accent color (baked-ember), spent deliberately and rarely
- Solid-fill semantic pills (priority/status) — meaning from color, never from stripes or gradients
- 44px minimum touch targets throughout, including secondary/ghost actions
- Radius caps at 12px (`rounded-md`); full-round is reserved for pills only

## Colors

The palette is a narrow, warm-neutral construction-site ground with one working brand color and one rationed accent — nothing decorative is allowed in.

### Primary
- **Moss Olive** (`oklch(0.48 0.15 132)`): the brand color and the only color used for primary actions (buttons, active nav state, focus rings, text selection). Its darker step, **Moss Olive Deep** (`oklch(0.415 0.148 132)`), is the hover/active state — there is no separate lighter tint.

### Secondary
- **Baked Ember** (`oklch(0.6 0.145 48)`): the sole accent, used only for `HIGH`-priority pills, `DELAYED`-status pills, and the rare secondary-accent moment. **The One Accent Rule.** Baked Ember never appears as a primary action color or a decorative flourish — it exists to be noticed exactly because it's rare.

### Neutral
- **Pure White** (`oklch(1 0 0)`): the page background (`--bg`) and the text color painted on every saturated fill (`on-primary`, `on-accent`, `on-danger`, `on-success` all resolve to this same value).
- **Warm Ivory** (`oklch(0.965 0.01 130)`): the surface tone for cards, sidebars, and secondary buttons — one step off pure white, never a separate gray family.
- **Warm Ivory Deep** (`oklch(0.935 0.014 130)`): a second surface step for hover states and nested containers (badges, `NOT_STARTED` pills).
- **Charcoal Ink** (`oklch(0.25 0.032 130)`): primary text color. Warm-tinted near-black, not a pure `#000`.
- **Dust Gray** (`oklch(0.5 0.022 130)`): secondary/muted text — hints, timestamps, placeholder copy.
- **Hairline** (`oklch(0.875 0.012 130)`): the single border color used for every divider, card outline, and input stroke in the system.

### Status colors
- **Alert Red** (`oklch(0.55 0.19 25)`): errors, destructive actions, `BLOCKED` status.
- **Caution Amber** (bg `oklch(0.94 0.06 90)` / ink `oklch(0.4 0.08 75)`): warning banners and `IN_PROGRESS` status — a pale tinted background paired with a dark ink, not a solid fill.
- **Field Green** (`oklch(0.5 0.15 145)`): success states and `COMPLETED` status. Distinct hue from Moss Olive — success is never confused with "brand."

### Named Rules
**The One Accent Rule.** Baked Ember is the only saturated color besides the semantic status set. It marks `HIGH` priority and nothing else is allowed to borrow it for emphasis.

## Typography

**Body Font:** Inter (with `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` fallback)

**Character:** One typeface, all weights. Hierarchy comes from size and weight (400/600/700), never from a second family — there is no separate display face because this system has no marketing surface to carry one.

### Hierarchy
- **Title** (700, 1.5rem / 24px, line-height 1.25, letter-spacing -0.02em): page headers (`PageHeader`'s `<h1>`). `text-wrap: balance` applied globally to h1–h3.
- **Headline** (700, 1.125rem / 18px, line-height 1.3): section headings within a page.
- **Body** (400, 1rem / 16px, line-height 1.55): all running text and form values. Paragraphs cap at 70ch (`text-wrap: pretty`).
- **Label** (600, 0.875rem / 14px): form field labels, sidebar nav items.
- **Micro-label** (700, 0.75rem / 12px, tracking-wide): priority/status pill text — the smallest text in the system, always bold to stay legible at that size.

### Named Rules
**The One Voice Rule.** There is exactly one typeface. Weight and size carry the entire hierarchy — never reach for a second font family to create emphasis.

## Layout

The shell is a fixed 1152px (`max-w-6xl`) centered container with a 16px (`px-4`) gutter, used consistently from the sticky header down through page content — this is the system's one container width; nothing wider or narrower appears except the login screen's intentionally narrow 448px (`max-w-md`) centered card.

Desktop (`lg:` and up) runs a persistent left sidebar (240px, `w-60`, sticky below the header) alongside the content column; below `lg`, the sidebar collapses into a slide-down mobile nav triggered from a hamburger button in the header. The header itself is a 64px (`h-16`) sticky bar pinned to the top of the viewport (`z-sticky`).

Spacing follows Tailwind's default scale with no project-specific overrides: card interior padding is consistently `p-5` (20px), form field groups use `gap-1.5`–`gap-3` (6–12px) depending on density, and the main content column carries `py-6 pb-16` to keep the bottom of a page clear of the fixed viewport edge on mobile.

## Elevation & Depth

Flat by default. Structure comes from the `hairline` border and the two-step `warm-ivory` / `warm-ivory-deep` surface tones, not from shadows — most cards, panels, and the `EmptyState` component are a flat bordered box on the white background.

### Shadow Vocabulary
- **Lifted card** (`box-shadow: var(--tw-shadow, 0 1px 2px 0 rgb(0 0 0 / 0.05))` — Tailwind's `shadow-sm`): reserved specifically for the overview dashboard's summary/stat cards, to lift them slightly above the otherwise-flat page. Not used on ordinary content cards, forms, or panels.

### Named Rules
**The Flat-By-Default Rule.** Shadows are not a general card treatment. `shadow-sm` is reserved for the small set of dashboard summary cards that need to read as "lifted" above the page; every other container (forms, list items, empty states, the admin panels) stays flat with a `hairline` border.

## Shapes

**The 12px Ceiling Rule.** `rounded-md` (12px) is the standard radius for every substantial container: buttons, inputs, cards, panels, the `EmptyState` box. `rounded-full` is reserved exclusively for pills and badges — priority/status pills, the neutral `Badge`, and the mobile menu toggle's circular hit area. No container in the system exceeds 12px except by drift (see Don'ts) — there is no default use of the theme's 16px (`rounded-lg`) or unrounded corners for standard surfaces.

## Components

Buttons, inputs, and pills share one vocabulary: sturdy and legible. Large, high-contrast, solid-fill hit targets — nothing here is meant to feel light or decorative, because the person using it may be reading it in direct sun with dusty gloves.

### Buttons
- **Shape:** `rounded-md` (12px), same radius family as every other container.
- **Primary:** solid Moss Olive fill, white text, `min-h-[44px]` (default size) or `min-h-[36px]` (`sm` size). Hover/active both step to Moss Olive Deep.
- **Secondary:** `warm-ivory` fill with a `hairline` border — used for the less-emphasized action in a pair (e.g. "cancel" next to "save").
- **Danger:** solid Alert Red fill, white text — destructive actions only.
- **Ghost:** transparent, ink text, `warm-ivory` on hover — used for low-emphasis inline actions (sign out, switch role).
- **Loading state:** a spinning `border-2 border-current border-t-transparent` ring replaces no content — it appears inline before the label, and the button disables itself (`aria-busy`) rather than swapping its label to "Loading…".
- **Disabled:** drops to `warm-ivory-deep` background with `dust-gray` text (primary variant) or reduced opacity (danger variant) — never fully hidden, so a disabled action stays legible as "not available right now."

### Inputs / Fields
- **Style:** `hairline` stroke, white background, `rounded-md`, `min-h-[44px]`, shared identically across text input, textarea, and select — one `inputBase` string, not three separate visual languages.
- **Focus:** the browser's native `:focus-visible` ring, recolored to Moss Olive with a 2px offset — no custom glow or border-shift trick.
- **Error:** the border switches to Alert Red (`aria-invalid=true`) and a `role="alert"` message renders below in Alert Red text; the `Field` wrapper shows hint text only when there's no error, never both at once.
- **Disabled:** `warm-ivory` background, `dust-gray` text, `cursor-not-allowed`.

### Pills (Priority / Status)
- **Style:** `rounded-full`, bold 12px micro-label text, solid semantic fill — `CRITICAL`/`BLOCKED` in Alert Red, `HIGH`/`DELAYED` in Baked Ember, `COMPLETED` in Field Green, `IN_PROGRESS` in the two-tone Caution Amber, `NOT_STARTED`/`LOW` as a neutral outlined `warm-ivory` pill.
- **Rule:** meaning comes from the fill color alone — never a side stripe, icon, or gradient standing in for status.

### Cards / Containers
- **Corner Style:** `rounded-md` (12px).
- **Background:** `warm-ivory` on the white page background — the one-step surface contrast is what reads as "a card," not a border-plus-shadow combination.
- **Shadow Strategy:** flat by default; see Elevation & Depth for the dashboard-summary-card exception.
- **Border:** `hairline`, 1px, on essentially every card and panel.
- **Internal Padding:** `p-5` (20px) is the standard; the `EmptyState` component follows the same recipe with a centered icon badge above its copy.

### Navigation
- **Style:** the sticky header carries the wordmark/logo, project name, and session controls; the left sidebar (desktop) or slide-down panel (mobile) lists the same nav items either way. Active state is a solid Moss Olive pill behind the item (not just a text color change); inactive items are ink-on-transparent with a `warm-ivory` hover. Role-gating happens by filtering the nav list itself (e.g. the Master Data link only renders for `head_office_admin`) rather than rendering a disabled link.

## Do's and Don'ts

### Do:
- **Do** use `rounded-md` (12px) for every new container, button, or input — it's the system's one ceiling.
- **Do** keep tap targets at `min-h-[44px]` for anything a user taps or clicks as a primary action; `sm` (36px) is the only sanctioned exception, for secondary/inline controls.
- **Do** spend Baked Ember rarely — it should never cover more area on a screen than a pill or a small icon badge.
- **Do** use the `warm-ivory` / `warm-ivory-deep` two-step surface system for layering, not a gray scale or new tint.
- **Do** respect `prefers-reduced-motion` — the global stylesheet already collapses all animation/transition durations to near-zero; new motion must not bypass it.

### Don't:
- **Don't** introduce a shadow on an ordinary card, panel, or form. `shadow-sm` is reserved for the dashboard's summary-card set only.
- **Don't** reach for a second typeface or a "display" font — this system carries its entire hierarchy in Inter's weight and size steps.
- **Don't** use raw Tailwind palette classes (`bg-amber-500/10`, `text-blue-700`, `border-purple-500/20`, `text-amber-900`, etc.) for color. Every color in this system routes through the OKLCH custom properties in `globals.css` and their Tailwind aliases (`bg-primary`, `text-danger`, `border-line`, …). **Known drift to clean up:** the role badges in `app-shell.tsx` (`getRoleBadge`) and several panels in `admin/page.tsx` currently use raw Tailwind amber/blue/purple classes — these predate this document and should be migrated to token-based equivalents (e.g. a new semantic role-badge token set) rather than treated as precedent for new work.
- **Don't** use `rounded-lg` (16px) for standard panels. `admin/page.tsx`'s panel containers currently do this — inconsistent with the 12px ceiling used everywhere else — and should migrate to `rounded-md` rather than be copied forward.
