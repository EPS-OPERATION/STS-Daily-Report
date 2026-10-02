# Frontend folder structure

STS follows the feature organization reviewed in LCenter's `dev` frontend (`apps/reviewer/src`, commit `def2dcc`). Existing MUI/theme and HTTP behavior remain the STS implementation.

```text
apps/web/src/
├── app/
│   ├── router/             # routes and application shell wiring
│   ├── layouts/
│   ├── providers/
│   └── theme/              # central MUI styles/tokens
├── components/
│   └── shared/             # PageHeader, EmptyState, StatusChip, KpiCard, placeholder
├── consts/
│   └── query-keys/         # auth, contractors, projects, site operations
├── features/
│   ├── auth/
│   ├── contractors/
│   ├── daily-reports/
│   ├── dashboard/
│   ├── field/
│   ├── projects/
│   ├── site-activity/
│   ├── site-configuration/
│   ├── site-maps/
│   ├── tomorrow-plan/
│   └── zone-configuration/ # retained legacy helper only
├── hooks/                  # queries shared by operational/configuration views
├── services/
│   ├── http/               # central transport and upload behavior
│   └── site-operations.api.ts
├── types/                  # Facility/Map/View/Activity DTOs shared across features
└── mock/                   # existing unfinished dashboard/report fixtures
```

## Ownership

- `features/<domain>/pages/`: route screens belong to their feature; router imports them directly. No root `src/pages` files or forwarding page wrappers remain.
- `features/<domain>/components/`: domain UI. Field navigation belongs to Field; dashboard's existing SVG belongs to Dashboard.
- `features/<domain>/hooks/`: feature-specific behavior and queries. Site Operations queries shared by Configuration and Activity live in root `hooks/`.
- `features/<domain>/helpers/`: pure feature helpers, including coordinate/view/selection logic in Site Maps. Create this directory only when a feature actually needs it.
- `features/site-maps/`: reusable Konva canvas, viewport controls, geometry helpers and retained legacy map types; does not own the Site Activity inspector or configuration dialog.
- `features/site-activity/`: operational screen, Facility inspector, Add/Edit Activity and reusable Activity detail experience.
- `features/site-configuration/`: administrative screen and resource editor.
- `components/shared/`: cross-feature presentation; MUI itself supplies UI primitives through the central theme. Do not introduce another UI library or wrapper for every MUI component.
- `consts/query-keys/`: one source per query namespace. Key values and cache invalidation semantics remain unchanged.
- Feature-local `api/schemas/types/context` directories remain where they already have a clear owner. The cross-feature Site Operations API/DTOs live centrally rather than being duplicated between Activity and Configuration.

## Main path changes

| Previous                                                 | Current                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `pages/<domain>-page.tsx`                                | `features/<domain>/pages/`                                      |
| `pages/site-plan-page.tsx`                               | `features/site-activity/pages/site-activity-page.tsx`           |
| `pages/site-configuration-page.tsx`                      | `features/site-configuration/pages/site-configuration-page.tsx` |
| `components/ui/*`                                        | `components/shared/*`                                           |
| `features/site-plan/components/site-activity-*`          | `features/site-activity/components/`                            |
| `features/site-plan/components/site-resource-dialog.tsx` | `features/site-configuration/components/`                       |
| reusable `features/site-plan/*`                          | `features/site-maps/*`                                          |
| feature `utils/`                                         | feature `helpers/`                                              |
| Site Operations API / hooks / DTOs                       | root `services/` / `hooks/` / `types/`                          |
| query keys in API/hook files                             | `consts/query-keys/`                                            |

Routes retain their URLs, including `/site-plan` and the `/site-plan/config` redirect. Facility selection, normalized markers, permissions, MinIO image loading and API contracts are unchanged. Existing regression imports follow the relocated helpers.

## Verification (2026-10-02)

- 38 source files relocated; existing helper-test imports updated. No runtime logic or query-key values changed except the route component's name from SitePlanPage to SiteActivityPage.
- Workspace typecheck, root `check` (lint/format/typecheck), API/web build and all 45 existing tests passed. Lint retains 9 existing warnings; Vite retains the large-chunk warning.
- Browser smoke checks: Site Activity image/marker loaded, click opened Facility inspector, Overview/Top switching retained selection, Add Activity prefilled the Facility, Site Configuration and Projects routes loaded. Fresh reload completed with no new console errors.
- Hot reload logged an earlier ProjectProvider error during module replacement; a fresh reload loaded the completed structure successfully. Smoke checks did not create or modify operational records.
