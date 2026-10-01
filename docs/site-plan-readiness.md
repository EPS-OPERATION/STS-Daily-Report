# STS Site Plan: point model and 3D contract

## Product and persistence

The business hierarchy remains **WBS Group → Physical Zone → optional Work Part → Site Activity**. Groups organize and aggregate; only physical leaf Zones represent facility locations. A Zone retains its WBS identity, activity history, contractors, manpower, QA/QC, tomorrow plan, and optional Work Parts.

Spatial interaction uses points in both renderers:

- 2D uses the Master Layout image and normalized `zone_map_points.x/y` coordinates.
- 3D uses a facility node's bounding-box top center as its marker anchor.
- Both call the same `selectedZoneId`; Part navigation also keeps `selectedPartId`.
- Parent groups have no physical marker. They focus the bounds of descendant points or facility roots.

Migration `0007` adds `zone_map_points` with one row per plan and Zone. Coordinates are either both normalized values or both null. A null pair is an explicit “marker removed” record, so a retained legacy polygon cannot restore a marker after an admin removes it. Existing leaf polygon rows get an initial bounds-center point; original `zone_map_areas` rows are preserved. `GET /projects/:projectId/site-plan` returns points only and derives a temporary center only for a legacy leaf row that has no point row. Parent rows are not treated as physical locations.

`zone_parts` stores operational Work Part data plus nullable normalized `map_x/map_y`; every Part remains valid without a map point. `site_activities.zone_id` remains required and `zone_part_id` is nullable. Null-Part activities remain zone-level work. Zone summaries scan each activity row once through `zone_id`.

Zone Configuration now has two exclusive modes: Zone marker placement and Work Part configuration. Marker drafts use the existing Konva canvas, support place/drag/remove, and save atomically. The legacy area API remains for transition compatibility; current web flows do not call it. Polygon overlap UI, area selection, and its `polygon-clipping` dependency were removed.

## Renderer-independent Site Activity state

`SitePlanView` owns project context, work date, contractor/status filters, `focusedParentId`, `selectedZoneId`, and `selectedPartId`. The inspector derives from those values and the current activities. The 2D Konva map and lazy 3D viewer receive the same selection and invoke the same Zone/Part navigation callbacks. The camera and Konva viewport remain local renderer state. Switching `[2D | 3D]` does not navigate away or reset selection.

No `selected2DZoneId` or `selected3DZoneId` exists. Facility identity is resolved by explicit manifest `zoneCode` against the active project's zones, then the viewer uses that project-specific Zone ID.

## Facility mapping proposal

| Facility key          | GLB node                  | WBS code | Current Zone                                                                                                                                        |
| --------------------- | ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Biomass_Storage`     | `FAC_Biomass_Storage`     | 1.1      | Biomass Storage                                                                                                                                     |
| `Fuel_Transportation` | `FAC_Fuel_Transportation` | 1.2      | Biomass Transport                                                                                                                                   |
| `Furnace_Boiler`      | `FAC_Furnace_Boiler`      | 2.1      | Furnace & Boiler                                                                                                                                    |
| `Flue_Gas_Treatment`  | `FAC_Flue_Gas_Treatment`  | 3.1      | Flue Gas Treatment                                                                                                                                  |
| `Stack`               | `FAC_Stack`               | 3.2      | Stack                                                                                                                                               |
| `Fly_Ash_Silo`        | `FAC_Fly_Ash_Silo`        | 2.4      | Fly Ash Silo                                                                                                                                        |
| `Bottom_Ash_Bunker`   | `FAC_Bottom_Ash_Bunker`   | 2.3      | Bottom Ash Bunker                                                                                                                                   |
| `Diesel_Oil_Tank`     | `FAC_Diesel_Oil_Tank`     | 2.2      | Diesel Oil Tank                                                                                                                                     |
| `CEMS_Room`           | `FAC_CEMS_Room`           | —        | No matching physical leaf exists in the current seeded WBS; it stays visible in the model without operational selection until the WBS is confirmed. |
| `TG_Building`         | `FAC_TG_Building`         | 4.1      | Turbine Generator Building                                                                                                                          |
| `ACC`                 | `FAC_ACC`                 | 5.1      | Air Cooled Condenser                                                                                                                                |

The typed manifest is [facility-3d-assets.ts](../apps/web/src/features/site-plan/types/facility-3d-assets.ts). It points to the local POC GLB for now; production URLs must come from authenticated MinIO storage. Multiple facility roots may map to one Zone in the manifest later. Node names are asset lookup keys, not database identity.

## First GLB metadata gate

Inspected `apps/web/public/site-plan/3d/sts-site-v1-layout-calibrated.glb` without modifying the Blender agent's files:

- GLB 2.0, 660,896 bytes (about 0.63 MiB), 302 nodes, 291 mesh objects, 291 primitives.
- 7,670 triangles, 9 materials, 0 embedded images, 0 cameras, and 0 lights.
- Scene roots include all 11 expected `FAC_*` facility groups plus `Ground`; facility components remain child objects under independently addressable roots.
- glTF's Y-up coordinate convention is used. Facility root scales are 1; several roots use 90° Y rotations to set their site orientation.
- Sample world bounds (X × Y × Z): Boiler 35.4 × 70.3 × 19.8; ACC 32.8 × 31.3 × 24.7; Stack 9 × 60 × 16.5; Ground 380 × 0 × 220.

Metadata checks pass for POC loading, low polygon count, material count, stable root names, and independent facility selection. Browser inspection is still needed for multi-angle appearance, placement, label collisions, loading time, and laptop performance. The 291 mesh objects can produce a high draw-call count despite the small triangle count; consolidate meshes by facility/material only if browser profiling shows it is needed.

## Runtime stack and acceptance checklist

The workspace uses React 19.3.0. The POC pins Three.js 0.186.0, React Three Fiber 9.8.1, Drei 10.7.9, and `@types/three` 0.186.0. Official R3F docs pair Fiber 9 with React 19; Drei 10.7.9 declares Fiber 9 and Three 0.159+ peers. The viewer is lazy-loaded and uses the real GLB.

For the first interactive review, verify:

- The model loads and displays in the expected isometric orientation.
- Orbit, pan, zoom, focus selected, and fit overview work.
- Facility markers use root bounds, status color, and the shared `selectedZoneId`.
- Selecting a facility updates the existing inspector; switching back to 2D keeps the same Zone/Part selection.
- GLB download and interaction stay responsive on a normal company laptop.
- Labels remain readable around nearby facilities; placement reflects the calibrated layout.
- Production deployment replaces the local `/public` path with the controlled MinIO asset URL.
