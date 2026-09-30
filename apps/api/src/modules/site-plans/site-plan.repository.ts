import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { sitePlans, zoneMapAreas, zones } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";
import type { PolygonGeometry } from "./site-plan.type.js";

export async function getDefaultSitePlan(db: Db, projectId: string) {
  const rows = await db
    .select()
    .from(sitePlans)
    .where(and(eq(sitePlans.projectId, projectId), eq(sitePlans.isDefault, true)))
    .limit(1);
  const plan = rows[0] ?? null;
  if (!plan) {
    const fallback = await db.select().from(sitePlans).where(eq(sitePlans.projectId, projectId)).limit(1);
    return fallback[0] ?? null;
  }
  return plan;
}

export async function listSitePlans(db: Db, projectId: string) {
  return db
    .select({ id: sitePlans.id, name: sitePlans.name, isDefault: sitePlans.isDefault })
    .from(sitePlans)
    .where(eq(sitePlans.projectId, projectId))
    .orderBy(desc(sitePlans.isDefault), asc(sitePlans.name));
}

export async function listAreasForPlan(db: Db, sitePlanId: string) {
  return db
    .select({
      id: zoneMapAreas.id,
      zone: {
        id: zones.id,
        code: zones.code,
        name: zones.name,
        parentId: zones.parentId,
        sortOrder: zones.sortOrder,
      },
      geometry: zoneMapAreas.geometry,
      defaultGeometry: zoneMapAreas.defaultGeometry,
    })
    .from(zoneMapAreas)
    .innerJoin(zones, eq(zoneMapAreas.zoneId, zones.id))
    .where(eq(zoneMapAreas.sitePlanId, sitePlanId))
    .orderBy(asc(zones.sortOrder), asc(zones.code));
}

export async function getSitePlanById(db: Db, id: string) {
  const rows = await db.select().from(sitePlans).where(eq(sitePlans.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createArea(db: Db, sitePlanId: string, zoneId: string, geometry: PolygonGeometry) {
  const rows = await db.insert(zoneMapAreas).values({ sitePlanId, zoneId, geometry }).returning();
  return rows[0]!;
}

export async function updateAreaConfig(db: Db, areaId: string, zoneId: string, geometry: PolygonGeometry) {
  const rows = await db
    .update(zoneMapAreas)
    .set({ zoneId, geometry, updatedAt: new Date() })
    .where(eq(zoneMapAreas.id, areaId))
    .returning();
  return rows[0] ?? null;
}

export async function deleteAreas(db: Db, areaIds: string[]) {
  if (areaIds.length === 0) return;
  await db.delete(zoneMapAreas).where(inArray(zoneMapAreas.id, areaIds));
}
