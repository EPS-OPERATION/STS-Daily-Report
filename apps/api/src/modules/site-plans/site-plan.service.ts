import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { getZoneById } from "@/modules/zones/zone.repository.js";
import { getStorage } from "@/shared/storage/index.js";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { parseGeometry } from "./site-plan.geometry.js";
import {
  createArea,
  deleteAreas,
  getDefaultSitePlan,
  getSitePlanById,
  listAreasForPlan,
  listSitePlans,
  updateAreaConfig,
} from "./site-plan.repository.js";
import type { PolygonGeometry } from "./site-plan.type.js";

function sameGeometry(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

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
  const areas = await listAreasForPlan(db, plan.id);
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
    areas: areas.map((a) => ({
      id: a.id,
      zone: a.zone,
      geometry: a.geometry,
      defaultGeometry: a.defaultGeometry,
      isCustom: a.defaultGeometry != null && !sameGeometry(a.geometry, a.defaultGeometry),
    })),
  };
}

export interface BulkAreaInput {
  areaId?: string;
  zoneId: string;
  geometry: unknown;
}

// One transaction applies drafts, new mappings, and deletions as a unit.
export async function saveMapAreasService(sitePlanId: string, entries: BulkAreaInput[], deleteAreaIds: string[]) {
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
  const updatedIds = new Set<string>();
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
  });
  return listAreasForPlan(getDb(), sitePlanId);
}
