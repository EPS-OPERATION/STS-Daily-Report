---
target: src/app/page.tsx
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
target_identity: "file:C:\\Users\\Moji\\OneDrive\\STS\\eps-daily-report-foundation\\src\\app\\page.tsx"
target_fingerprint: "sha256:3d71aec0b401e5adabea01a67d1e8583d8339f16be5dde3c199873e5bffc8d36"
target_path: "C:\\Users\\Moji\\OneDrive\\STS\\eps-daily-report-foundation\\src\\app\\page.tsx"
timestamp: 2026-09-09T07-24-17Z
slug: src-app-page-tsx
closed: true
---
# Design Critique — EPS Daily Report (`/`, source: `src/app/page.tsx` + shared shell)

**Method:** dual-agent (A: design-review sub-agent · B: detector + browser-evidence sub-agent), isolated, synthesized here.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Weather card shows live sync/timestamp; but no page tells staff whether today's report is already submitted |
| 2 | Match System / Real World | 4 | Correct site vocabulary, Thai Buddhist-era dates, domain-accurate copy |
| 3 | User Control and Freedom | 3 | Modal has a working cancel; no Escape/backdrop-close observed |
| 4 | Consistency and Standards | 1 | project-map-weather.tsx uses raw Tailwind blues/gradients/shadows/emoji while every other component is flat and token-driven — two design systems on one page |
| 5 | Error Prevention | 2 | Login only checks non-empty (not email format); modal lat/lon fields take arbitrary text |
| 6 | Recognition Rather Than Recall | 4 | Consistent aria-current active-nav state, Thai labels throughout |
| 7 | Flexibility and Efficiency | 1 | Daily-use tool, no keyboard fast-path to "new report," redundant CTAs add friction instead of removing it |
| 8 | Aesthetic and Minimalist Design | 2 | Report cards/empty states are clean; the weather card reintroduces visual noise the rest of the app deliberately avoids |
| 9 | Error Recovery | 2 | Login failure renders in the warning (amber) token, not danger (red) — the app has a dedicated danger token it doesn't use here |
| 10 | Help and Documentation | 1 | The one line explaining "this is Phase 1, most pages are intentionally empty" is buried in text-xs text-muted at the bottom of the desktop sidebar only |
| **Total** | | **23/40** | **Acceptable — significant improvements needed before users are happy** |

## Design Specificity Verdict

**Design review:** Genuinely authored for this product, not a reskin — real site vocabulary (ใบอนุญาตทำงาน/Permits, Safety Talk, CRITICAL-escalation requiring justification+due date+impact "set by humans only"), invite-only auth model, and 44px touch targets baked into every primitive as a deliberate nod to gloved hands on-site. But src/components/project-map-weather.tsx — the single most prominent element on the homepage — abandons that system entirely for hardcoded Tailwind blues, gradients, drop shadows, glassmorphism, and emoji. It reads like a vendored widget dropped into an otherwise bespoke app: authored identity, undermined by one unassimilated module.

**Deterministic scan:** detect.mjs against src/app + src/components returned 0 findings (exit 0). Expected — the rule engine catches generic slop patterns, not "two design systems coexisting," which is a semantic judgment the LLM pass caught and the detector structurally can't.

**Browser evidence:** No user-visible overlay tab exists — evidence was gathered via direct Playwright screenshots/contrast scripts rather than the skill's live-server.mjs injection flow. Concretely: 0 console errors across 5 pages × 2 viewports, no horizontal overflow anywhere, and strong focus-ring coverage everywhere except the one modal (corroborates the P1 below). The contrast scanner also flagged 15 text elements per viewport on the weather card as indeterminate (not failing) because they sit on a CSS gradient background it can't pixel-sample.

## Overall Impression

The core app (nav, forms, empty states) is quietly professional and clearly built for this exact audience. Then the homepage's weather/map card jolts the register into a completely different, louder visual language, and the page deflates into a run of gray empty-state boxes right after — calm → glossy surprise → flat anticlimax. That whiplash, more than any single flaw, is what reads as "not friendly."

## What's Working

1. EmptyState copy discipline — every empty state explains what will appear and why it's empty now, unusually strong trust-building for a safety-relevant field.
2. 44px minimum touch targets everywhere, enforced at the component-primitive level — a real, consistently-executed accommodation for gloved hands on-site.
3. Zero console errors, zero layout overflow, strong focus-ring coverage across every page and both viewports — the accessibility intent stated in code comments is mostly actually executed.

## Priority Issues

[P0] ProjectMapWeather breaks the design system on the most prominent element of the homepage — it's the first thing under the masthead and invisible to the token system. Fix: rebuild using existing tokens, drop gradient/emoji/backdrop-blur.

[P1] Focus ring removed inside the app's one modal, which also lacks dialog semantics — the location-edit modal's inputs use focus:outline-hidden, overriding the global focus contract, and has no role="dialog"/aria-modal/Escape-to-close. Fix: remove override, add dialog semantics and initial focus.

[P2] /admin, /history, /updates render full content with no auth gate observed — expected today (Auth slice is next in docs/TASKS.md, not built yet), no real data exposed, but worth flagging before real data lands.

[P2] Three competing "start a report" CTAs on one screen — daily users re-decide "which button" every day. Fix: drop the header CTA, the two report-type cards already cover both entry points.

[P2] PriorityPill LOW variant likely under contrast threshold — text-muted on bg-surface on 12px bold pill text, on the priority tier that most needs to stay legible in a safety context. Fix: verify contrast against --surface specifically.

[P3] Login errors render in the warning (amber) token, not danger (red) — dilutes the color vocabulary established elsewhere. Fix: switch FormError to --danger/--on-danger.

## Persona Red Flags

Alex (daily power user): Re-decides "which of 3 buttons" every day; no indicator anywhere on / showing whether today's report was already submitted; no keyboard fast-path to start a report.

Jordan (first-timer): Homepage description says "numbers will link automatically once the database system is enabled" — implementation-status language leaking into product copy. The line that would fix that framing is buried at text-xs text-muted at the bottom of the desktop sidebar only.

Sam (accessibility-dependent): Loses focus visibility in exactly the one modal in the app; no dialog-role announcement on modal open; LOW-priority pill contrast affects distinguishing priority tiers.

## Minor Observations

- login-form.tsx's noValidate form only checks non-empty, not email format.
- SkeletonBlock/.skeleton exists in the design system but appears unused anywhere; the weather card hand-rolls its own loading text instead.
- /login, /history, /updates all leave large blank vertical space below their content at desktop width (1280px).

## Questions to Consider

- Why did engineering effort go into a fully live weather API + interactive map with its own bespoke visual language before either daily-report form exists?
- Was project-map-weather.tsx vendored from a tutorial and never handed to whoever owns the token system?
