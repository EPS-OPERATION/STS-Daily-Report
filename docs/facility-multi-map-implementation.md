# Facility and multi-map implementation progress

Source: the user-approved implementation requirements and [architecture audit](site-facility-architecture-audit.md).

## Required phases

- [x] Inspect the current `dev` branch and confirm the cleaned database has only one development user.
- [x] Add Facility, dynamic Map View and normalized Facility Marker schemas; reuse `site_plans` and `zone_parts`; retain legacy identifiers and data.
- [x] Prove populated legacy backfill and repeatability in a generated, separate test database. Preserve ambiguous parent activity and report unresolved records.
- [x] Apply additive migrations `0011`–`0013` locally and retain user-only development data.
- [x] Implement Facility/Map/View/Marker APIs with transaction and Project validation.
- [x] Implement Facility Part APIs and canonical Activity ownership, SQL filtering and summaries.
- [x] Add a default-deny Site Configuration capability to the existing auth context; protect new and reachable legacy writes. No real account is granted implicitly.
- [ ] Prove a generic ACC flow through real browser/API persistence, then TR without Zone, then ACC reuse on another Map.
- [x] Implement dynamic Site Configuration and Site Activity, upload/replace View images via MinIO, optional Parts and shared Activity detail.
- [x] Add the minimal Project setup and contractor assignment necessary for an empty installation.
- [ ] Verify all CRUD/ownership/permission/filter/summary/draft/selection cases, migration compatibility, desktop/mobile browser flows and unrelated routes.
- [ ] Complete typecheck, lint/check and build; remove only verified dead frontend dependencies and document retained legacy storage.

## Verification boundaries

`apps/api/tests/facility-backfill.test.ts` creates an isolated `sts_facility_test_<random>` database, applies historical migrations, loads legacy fixtures, applies the additive migration, runs backfill twice, and drops that exact generated database. It does not insert fixtures into the development database.

`db:backfill-facilities` is an explicit re-runnable compatibility operation. It reports Activities and Parts without a resolved Facility. `db:seed` remains user-only. Keep all legacy tables, columns and IDs until the complete migration gate in the user's requirements has been proven.

The complete objective remains active until real ACC, TR, multi-map and browser persistence flows are verified; an additive schema or passing build alone is not completion.

## Implemented domain and API

- `facilities`: Project-owned UUID identity, stable scoped key, scoped optional code, archive state, optional internal `legacy_zone_id`. Public DTOs do not expose the legacy link.
- `site_plans`: reused as Site Map; adds description and active state. Default changes are serialized on the Project row.
- `site_map_views`: dynamic keys/names, order and active state, object-storage image key or migrated legacy asset URL, independent dimensions.
- `facility_map_markers`: unique Facility/View pair with database coordinate checks. Bulk draft writes validate all rows and Project ownership before one transaction. Removal deletes placement only.
- `zone_parts`: retained table and IDs; canonical `facility_id`, nullable legacy `zone_id`. New Facility Parts do not require a Zone or marker.
- `site_activities`: additive Facility/Part references, nullable legacy Zone columns. New writes require an active Facility; optional Part must belong to it. Whole-Facility work remains valid with Parts present.
- SQL Activity reads use left joins for legacy locations, server filters and pagination. Facility summaries count Activity rows once, distinct Contractors and actual Activity manpower. Status represents the current filtered dataset.

Canonical routes are under `/api/v1`:

| Resource        | Routes                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Project         | `GET/POST /projects`, `GET/PATCH /projects/:id`, `PUT /projects/:id/contractors`                              |
| Facility        | `GET/POST /projects/:projectId/facilities`, `GET/PATCH/DELETE /facilities/:facilityId`                        |
| Work Part       | `GET/POST /facilities/:facilityId/parts`, `GET/PATCH/DELETE /facility-parts/:facilityPartId`                  |
| Map             | `GET/POST /projects/:projectId/site-maps`, `GET/PATCH/DELETE /site-maps/:siteMapId`                           |
| View            | `GET/POST /site-maps/:siteMapId/views`, `GET/PATCH/DELETE /site-map-views/:siteMapViewId`                     |
| Image           | `POST /site-map-views/:siteMapViewId/image` (multipart file and dimensions)                                   |
| Marker          | `GET/PUT /site-map-views/:siteMapViewId/markers`, `DELETE /site-map-views/:siteMapViewId/markers/:facilityId` |
| Placement index | `GET /facilities/:facilityId/map-placements`                                                                  |
| Activity        | existing Project Activity routes plus Facility/Part filters, detail and Facility summary routes               |

Images accept PNG/JPEG/WebP with signature and size checks; uploads use authenticated configuration writes and MinIO. Read URLs expire after 15 minutes; active View queries refresh after 10 minutes. `MINIO_PUBLIC_URL` separates the browser-accessible signed hostname from Docker's internal MinIO endpoint. Multipart client requests leave the boundary to the browser.

## UI implemented

- `/projects`: real create/edit and assigned Contractor setup, including empty-install state.
- `/site-configuration`: Maps and Facilities sections; dynamic Views and image upload, create/reuse Facilities, independent marker drafts with Save/Discard, marker placement index and Work Parts. `/site-plan/config` redirects here.
- `/site-plan`: dynamic Map/View selection, canonical Facility/Part state, server-filtered Activity inspector, shared detail/edit dialog, Add Activity prefill, compact point status/counts and accessible marker buttons. Unselected map takes full workspace; mobile uses a bottom sheet.
- Map/View changes preserve the selected Facility even without placement. Parts stay in the inspector rather than cluttering the site map.
- Reachable legacy configuration writes and all new configuration writes require explicit `can_manage_site_configuration=true`. Navigation mirrors the flag. No real development user has been granted it; choosing an account/grant remains pending.

## Verification recorded on 2026-10-01

- Bun tests: **47 passed, 0 failed**, including isolated populated backfill, ACC/TR Facility-native ownership, cross-Project rejection, atomic marker writes, SQL filtering/summary, default-deny HTTP checks, native multipart MinIO upload/replace/read, and native-map backfill repeatability.
- Workspace typecheck: passed. Lint: 0 errors, 9 existing warnings. API and web builds: passed; Vite retains its large-chunk warning. Formatting cleanup for changed implementation files remains in progress.
- Disposable browser database contains only explicitly granted test identities initially; the browser created the Project, Map, ACC/TR, optional Parts, Contractor assignment and Activities through the UI. Normal development seed/data was not changed.
- Browser: ACC whole-Facility and Part Activities saved; summary verified as 2 Activities, 1 Contractor, 26 Workers. TR whole-Facility and Part Activities saved without a Zone; total verified as 2 Activities, 1 Contractor, 8 Workers. Reload/new-page retrieval verified persisted TR work. Shared detail and Add Activity prefill/Part reset verified.
- Database inspection confirmed native ACC/TR Facilities and Parts have null legacy Zone references, native Activities have null `zone_id`, and the disposable database has zero Zones.
- Mobile 390×844: Facility selection opened a full-width bottom sheet with real summary and both TR Activities; temporary viewport reset afterwards. Actual touch gestures/marker tapping are not yet verified.
- Browser image upload stopped because the Edge extension denies local-file access. The user was given the official setting instructions; no permission bypass or raw CDP fallback was used. The full image/marker placement, view-switch and second-Map browser flows remain pending. API integration tests already cover upload and multi-Map Facility reuse independently.
- No console errors observed in the checked browser flow; one Emotion duplicate-instance warning appeared during development hot reload and remains recorded.

## External migration and retained compatibility

1. Back up the target environment and record Facility, Part, Activity and legacy marker counts before migration.
2. Apply additive migrations in order; do not seed production product data.
3. Run the explicit `db:backfill-facilities` operation, retain its unresolved-row report and compare row IDs/counts/history. The operation deduplicates Project/key definitions across Maps, keeps TR without a Zone, preserves explicit marker removals, and never guesses an Overview projection from Top polygons.
4. Resolve ambiguous parent-WBS Activities manually through a verified business mapping; they remain preserved rather than silently reassigned. Repeat the operation to prove no additional rows appear.
5. Validate ACC, a Facility without a Zone, multiple Maps and existing legacy integrations against that environment before removing any compatibility storage.

Legacy Zones, polygons, marker definitions, Zone Part endpoints and old Activity columns remain. Unmounted old frontend editors and the isolated experimental R3F viewer are retained until the migration completion gate is actually met. No destructive legacy cleanup is authorized by a passing local build alone.
