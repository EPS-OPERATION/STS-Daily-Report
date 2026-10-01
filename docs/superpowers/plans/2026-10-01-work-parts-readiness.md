# Site Plan point and Work Part implementation

## Delivered

- Added `zone_parts` and nullable `site_activities.zone_part_id`; activity rows retain `zone_id` and old null-Part records remain valid.
- Added optional normalized Work Part point coordinates and a separate Part editor mode.
- Added `zone_map_points`, leaf polygon-center backfill, explicit removal rows, normalized point API, and legacy polygon fallback without returning polygons to Site Activity.
- Replaced the 2D polygon renderer/editor with point markers; removed overlap UI and unused polygon editor modules.
- Added a lazy 3D viewer for the inspected calibrated GLB. The viewer maps explicit `FAC_*` roots by WBS code and shares `selectedZoneId`/`selectedPartId` with the 2D flow.
- Documented facility mappings, state ownership, POC asset metadata, and the MinIO production path in `docs/site-plan-readiness.md`.

## Verification

Migration `0007` was applied to the local PostgreSQL database. It backfilled 7 leaf point rows and retained all 13 legacy map-area rows. Targeted Bun tests and API/web typechecks passed during implementation. Full tests, lint, build, and desktop/mobile browser verification are recorded in the final task report after they run.

## Remaining asset review

The Blender GLB metadata gate passed. Visual quality from multiple camera angles and performance on a normal company laptop still require browser review; production asset delivery remains a MinIO concern.
