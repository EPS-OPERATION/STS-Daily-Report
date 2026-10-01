import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { getZoneById, hasZoneChildren, listZones, updateZoneDisplayColor } from "@/modules/zones/zone.repository.js";
import { normalizeZoneColor } from "@/modules/zones/zone.color.js";
import { getStorage } from "@/shared/storage/index.js";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { parseGeometry, parseNormalizedPoint } from "./site-plan.geometry.js";
import {
  createArea,
  deleteAreas,
  getDefaultSitePlan,
  getSitePlanById,
  listAreasForPlan,
  listMarkerDefinitionsForPlan,
  listSitePlans,
  saveMarkerPositions,
  updateAreaConfig,
} from "./site-plan.repository.js";
import type { PolygonGeometry } from "./site-plan.type.js";

export async function listProjectSitePlansService(projectId: string) {
  const db = getDb();
  if (!(await getProjectById(db, projectId))) throw new NotFoundError("Project not found", { projectId });
  return listSitePlans(db, projectId);
}

export async function getProjectSitePlanService(projectId: string, sitePlanId?: string) {
  const db = getDb();
  const project = await getProjectById(db, projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  const plan = sitePlanId ? await getSitePlanById(db, sitePlanId) : await getDefaultSitePlan(db, projectId);
  if (!plan || plan.projectId !== projectId) throw new NotFoundError("No site plan for this project", { projectId });
  if (
    plan.backgroundObjectKey &&
    (!plan.originalWidth || !plan.originalHeight || plan.originalWidth < 1 || plan.originalHeight < 1)
  ) {
    throw new ValidationError("Site plan background dimensions must be set before using object storage", {
      sitePlanId: plan.id,
    });
  }
  const [projectZones, definitions] = await Promise.all([
    listZones(db, projectId, "all"),
    listMarkerDefinitionsForPlan(db, plan.id),
  ]);
  const facilities = definitions.map((definition) => ({
    no: definition.no,
    key: definition.key,
    name: definition.name,
    zone: projectZones.find((zone) => zone.id === definition.zoneId) ?? null,
    overview:
      definition.overviewX == null || definition.overviewY == null
        ? null
        : { x: definition.overviewX, y: definition.overviewY },
    topView:
      definition.topViewX == null || definition.topViewY == null
        ? null
        : { x: definition.topViewX, y: definition.topViewY },
  }));
  const points = facilities.flatMap((facility) => [
    ...(facility.overview
      ? [
          {
            zoneId: facility.zone?.id ?? null,
            facilityKey: facility.key,
            view: "overview" as const,
            facility: { no: facility.no, key: facility.key, name: facility.name },
            zone: facility.zone,
            ...facility.overview,
          },
        ]
      : []),
    ...(facility.topView
      ? [
          {
            zoneId: facility.zone?.id ?? null,
            facilityKey: facility.key,
            view: "top" as const,
            facility: { no: facility.no, key: facility.key, name: facility.name },
            zone: facility.zone,
            ...facility.topView,
          },
        ]
      : []),
  ]);

  return {
    id: plan.id,
    projectId: plan.projectId,
    name: plan.name,
    background: {
      objectKey: plan.backgroundObjectKey,
      url: plan.backgroundObjectKey ? await getStorage().getPresignedUrl(plan.backgroundObjectKey, 900) : null,
      width: plan.originalWidth,
      height: plan.originalHeight,
    },
    points,
    facilities,
  };
}

export interface BulkAreaInput {
  areaId?: string;
  zoneId: string;
  geometry: unknown;
}

export interface BulkZoneColorInput {
  zoneId: string;
  displayColor: unknown;
}

export interface BulkMapPointInput {
  facilityKey: string;
  view: "overview" | "top";
  x: number | null;
  y: number | null;
}

export async function saveMapPointsService(
  sitePlanId: string,
  locations: BulkMapPointInput[],
  zoneColors: BulkZoneColorInput[] = [],
) {
  const db = getDb();
  const plan = await getSitePlanById(db, sitePlanId);
  if (!plan) throw new NotFoundError("Site plan not found", { sitePlanId });
  const definitions = await listMarkerDefinitionsForPlan(db, sitePlanId);
  const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]));
  const seen = new Set<string>();
  const parsed: BulkMapPointInput[] = [];
  for (const location of locations) {
    const definition = definitionsByKey.get(location.facilityKey);
    if (!definition)
      throw new NotFoundError("Facility marker definition not found", { facilityKey: location.facilityKey });
    const markerKey = location.view + ":" + location.facilityKey;
    if (seen.has(markerKey))
      throw new ValidationError("Facility marker appears more than once in this view", {
        facilityKey: location.facilityKey,
      });
    seen.add(markerKey);
    if (definition.zoneId) {
      const zone = await getZoneById(db, definition.zoneId);
      if (!zone || zone.projectId !== plan.projectId || (await hasZoneChildren(db, zone.id))) {
        throw new ValidationError("Facility must map to a physical Zone in this project", {
          facilityKey: location.facilityKey,
        });
      }
    }
    const bothNull = location.x === null && location.y === null;
    if (!bothNull && (location.x == null || location.y == null)) {
      throw new ValidationError("Both marker coordinates must be supplied together", {
        facilityKey: location.facilityKey,
      });
    }
    const point = bothNull ? null : parseNormalizedPoint({ x: location.x, y: location.y });
    parsed.push({ facilityKey: location.facilityKey, view: location.view, x: point?.x ?? null, y: point?.y ?? null });
  }

  const colorIds = new Set<string>();
  const parsedColors: { zoneId: string; displayColor: string }[] = [];
  for (const entry of zoneColors) {
    if (colorIds.has(entry.zoneId))
      throw new ValidationError("Zone color appears more than once", { zoneId: entry.zoneId });
    colorIds.add(entry.zoneId);
    const zone = await getZoneById(db, entry.zoneId);
    if (!zone) throw new NotFoundError("Zone not found", { zoneId: entry.zoneId });
    if (zone.projectId !== plan.projectId)
      throw new ValidationError("Zone does not belong to this project", { zoneId: entry.zoneId });
    parsedColors.push({ zoneId: entry.zoneId, displayColor: normalizeZoneColor(entry.displayColor) });
  }

  await db.transaction(async (tx) => {
    await saveMarkerPositions(tx as never, sitePlanId, parsed);
    for (const color of parsedColors) await updateZoneDisplayColor(tx as never, color.zoneId, color.displayColor);
  });
  return (await getProjectSitePlanService(plan.projectId, sitePlanId)).points;
}

// One transaction applies drafts, new mappings, and deletions as a unit.
export async function saveMapAreasService(
  sitePlanId: string,
  entries: BulkAreaInput[],
  deleteAreaIds: string[],
  zoneColors: BulkZoneColorInput[] = [],
) {
  const db = getDb();
  const plan = await getSitePlanById(db, sitePlanId);
  if (!plan) throw new NotFoundError("Site plan not found", { sitePlanId });
  const existing = await listAreasForPlan(db, sitePlanId);
  const existingById = new Map(existing.map((area) => [area.id, area]));
  const deleted = new Set(deleteAreaIds);
  if (deleted.size !== deleteAreaIds.length) throw new ValidationError("Duplicate map area deletion");
  for (const areaId of deleted) {
    if (!existingById.has(areaId)) throw new NotFoundError("Map area not found", { areaId });
  }

  const parsed: { areaId?: string; zoneId: string; geometry: PolygonGeometry }[] = [];
  const parsedColors: { zoneId: string; displayColor: string }[] = [];
  const updatedIds = new Set<string>();
  const colorZoneIds = new Set<string>();
  const areaByZoneId = new Map(existing.map((area) => [area.zone.id, area]));
  for (const entry of entries) {
    const current = entry.areaId ? existingById.get(entry.areaId) : undefined;
    if (entry.areaId && !current) throw new NotFoundError("Map area not found", { areaId: entry.areaId });
    if (entry.areaId && (deleted.has(entry.areaId) || updatedIds.has(entry.areaId))) {
      throw new ValidationError("Map area appears more than once", { areaId: entry.areaId });
    }
    if (entry.areaId) updatedIds.add(entry.areaId);

    const zone = await getZoneById(db, entry.zoneId);
    if (!zone) throw new NotFoundError("Zone not found", { zoneId: entry.zoneId });
    if (zone.projectId !== plan.projectId) {
      throw new ValidationError("Zone does not belong to the plan project", { zoneId: entry.zoneId });
    }
    const currentOwner = areaByZoneId.get(entry.zoneId);
    if (currentOwner && currentOwner.id !== entry.areaId && !deleted.has(currentOwner.id)) {
      throw new ConflictError("Zone already has a mapped area on this plan", { zoneId: entry.zoneId });
    }
    parsed.push({ areaId: entry.areaId, zoneId: entry.zoneId, geometry: parseGeometry(entry.geometry) });
  }

  for (const entry of zoneColors) {
    if (colorZoneIds.has(entry.zoneId))
      throw new ValidationError("Zone color appears more than once", { zoneId: entry.zoneId });
    colorZoneIds.add(entry.zoneId);
    const zone = await getZoneById(db, entry.zoneId);
    if (!zone) throw new NotFoundError("Zone not found", { zoneId: entry.zoneId });
    if (zone.projectId !== plan.projectId) {
      throw new ValidationError("Zone does not belong to the plan project", { zoneId: entry.zoneId });
    }
    parsedColors.push({ zoneId: entry.zoneId, displayColor: normalizeZoneColor(entry.displayColor) });
  }

  const finalZoneIds = new Set<string>();
  const submittedByAreaId = new Map<string, (typeof parsed)[number]>();
  for (const area of parsed) {
    if (area.areaId) submittedByAreaId.set(area.areaId, area);
  }
  for (const area of existing) {
    if (deleted.has(area.id)) continue;
    const submitted = submittedByAreaId.get(area.id);
    const zoneId = submitted?.zoneId ?? area.zone.id;
    if (finalZoneIds.has(zoneId)) throw new ConflictError("Zone already has a mapped area on this plan", { zoneId });
    finalZoneIds.add(zoneId);
  }
  for (const area of parsed.filter((entry) => !entry.areaId)) {
    if (finalZoneIds.has(area.zoneId)) {
      throw new ConflictError("Zone already has a mapped area on this plan", { zoneId: area.zoneId });
    }
    finalZoneIds.add(area.zoneId);
  }

  await db.transaction(async (tx) => {
    await deleteAreas(tx as never, [...deleted]);
    for (const area of parsed) {
      if (area.areaId) await updateAreaConfig(tx as never, area.areaId, area.zoneId, area.geometry);
      else await createArea(tx as never, sitePlanId, area.zoneId, area.geometry);
    }
    for (const color of parsedColors) await updateZoneDisplayColor(tx as never, color.zoneId, color.displayColor);
  });
  return listAreasForPlan(getDb(), sitePlanId);
}
