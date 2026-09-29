import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { getZoneById } from "@/modules/zones/zone.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { parseGeometry } from "./site-plan.geometry.js";
import {
  createArea,
  deleteArea,
  findAreaByPlanAndZone,
  getAreaById,
  getDefaultSitePlan,
  getSitePlanById,
  listAreasForPlan,
  reassignAreaZone,
  resetAreaToDefault,
  updateAreaGeometry,
} from "./site-plan.repository.js";
import type { PolygonGeometry } from "./site-plan.type.js";

function sameGeometry(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function assertPlanZone(planId: string, zoneId: string) {
  const db = getDb();
  const plan = await getSitePlanById(db, planId);
  if (!plan) throw new NotFoundError("Site plan not found", { sitePlanId: planId });
  const zone = await getZoneById(db, zoneId);
  if (!zone) throw new NotFoundError("Zone not found", { zoneId });
  if (zone.projectId !== plan.projectId) {
    throw new ValidationError("Zone does not belong to the plan project", { zoneId, sitePlanId: planId });
  }
  return { plan, zone };
}

export async function getProjectSitePlanService(projectId: string) {
  const project = await getProjectById(getDb(), projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  const plan = await getDefaultSitePlan(getDb(), projectId);
  if (!plan) throw new NotFoundError("No site plan for this project", { projectId });
  const areas = await listAreasForPlan(getDb(), plan.id);
  return {
    id: plan.id,
    projectId: plan.projectId,
    name: plan.name,
    background: { objectKey: plan.backgroundObjectKey, url: null as string | null },
    areas: areas.map((a) => ({
      id: a.id,
      zone: a.zone,
      geometry: a.geometry,
      isCustom: a.defaultGeometry != null && !sameGeometry(a.geometry, a.defaultGeometry),
    })),
  };
}

export async function createAreaService(sitePlanId: string, zoneId: string, geometry: unknown) {
  await assertPlanZone(sitePlanId, zoneId);
  const parsed = parseGeometry(geometry);
  const existing = await findAreaByPlanAndZone(getDb(), sitePlanId, zoneId);
  if (existing) throw new ConflictError("Zone already has a mapped area on this plan", { zoneId, sitePlanId });
  return createArea(getDb(), sitePlanId, zoneId, parsed);
}

export interface AreaPatch {
  zoneId?: string;
  geometry?: unknown;
}

export async function updateAreaService(areaId: string, patch: AreaPatch) {
  const db = getDb();
  const area = await getAreaById(db, areaId);
  if (!area) throw new NotFoundError("Map area not found", { areaId });
  if (patch.zoneId !== undefined && patch.zoneId !== area.zoneId) {
    const plan = await getSitePlanById(db, area.sitePlanId);
    const zone = await getZoneById(db, patch.zoneId);
    if (!zone) throw new NotFoundError("Zone not found", { zoneId: patch.zoneId });
    if (!plan || zone.projectId !== plan.projectId) {
      throw new ValidationError("Zone does not belong to the plan project", { zoneId: patch.zoneId });
    }
    const clash = await findAreaByPlanAndZone(db, area.sitePlanId, patch.zoneId);
    if (clash && clash.id !== areaId) {
      throw new ConflictError("Zone already has a mapped area on this plan", { zoneId: patch.zoneId });
    }
    await reassignAreaZone(db, areaId, patch.zoneId);
  }
  if (patch.geometry !== undefined) {
    await updateAreaGeometry(db, areaId, parseGeometry(patch.geometry));
  }
  const updated = await getAreaById(db, areaId);
  if (!updated) throw new NotFoundError("Map area not found", { areaId });
  return updated;
}

export async function deleteAreaService(areaId: string) {
  // Removes the geometry assignment only — zones, activities and
  // contractors are untouched.
  const ok = await deleteArea(getDb(), areaId);
  if (!ok) throw new NotFoundError("Map area not found", { areaId });
}

export async function resetAreaService(areaId: string) {
  const reset = await resetAreaToDefault(getDb(), areaId);
  if (!reset) throw new NotFoundError("Map area not found or has no default geometry", { areaId });
  return reset;
}

export interface BulkAreaInput {
  zoneId: string;
  geometry: unknown;
}

// Atomic save: every entry valid -> all applied; one invalid -> nothing saved.
export async function bulkSaveAreasService(sitePlanId: string, entries: BulkAreaInput[]) {
  const db = getDb();
  const plan = await getSitePlanById(db, sitePlanId);
  if (!plan) throw new NotFoundError("Site plan not found", { sitePlanId });
  const parsed: { zoneId: string; geometry: PolygonGeometry }[] = [];
  for (const e of entries) {
    const zone = await getZoneById(db, e.zoneId);
    if (!zone) throw new NotFoundError("Zone not found", { zoneId: e.zoneId });
    if (zone.projectId !== plan.projectId) {
      throw new ValidationError("Zone does not belong to the plan project", { zoneId: e.zoneId });
    }
    parsed.push({ zoneId: e.zoneId, geometry: parseGeometry(e.geometry) });
  }
  await db.transaction(async (tx) => {
    for (const p of parsed) {
      const existing = await findAreaByPlanAndZone(tx as never, sitePlanId, p.zoneId);
      if (existing) {
        await updateAreaGeometry(tx as never, existing.id, p.geometry);
      } else {
        await createArea(tx as never, sitePlanId, p.zoneId, p.geometry);
      }
    }
  });
  return listAreasForPlan(getDb(), sitePlanId);
}

// Legacy admin upsert by (plan, zone); prefer area-id endpoints for edits.
export async function putZoneGeometryService(sitePlanId: string, zoneId: string, geometry: unknown) {
  await assertPlanZone(sitePlanId, zoneId);
  const parsed = parseGeometry(geometry);
  const db = getDb();
  const existing = await findAreaByPlanAndZone(db, sitePlanId, zoneId);
  if (existing) {
    const updated = await updateAreaGeometry(db, existing.id, parsed);
    if (!updated) throw new NotFoundError("Map area not found", { sitePlanId, zoneId });
    return updated;
  }
  return createArea(db, sitePlanId, zoneId, parsed);
}
