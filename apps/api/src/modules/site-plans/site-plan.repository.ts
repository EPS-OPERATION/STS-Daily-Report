import { and, eq } from "drizzle-orm";
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
    const fallback = await db
      .select()
      .from(sitePlans)
      .where(eq(sitePlans.projectId, projectId))
      .limit(1);
    return fallback[0] ?? null;
  }
  return plan;
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
    .where(eq(zoneMapAreas.sitePlanId, sitePlanId));
}

export async function getSitePlanById(db: Db, id: string) {
  const rows = await db.select().from(sitePlans).where(eq(sitePlans.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAreaById(db: Db, areaId: string) {
  const rows = await db.select().from(zoneMapAreas).where(eq(zoneMapAreas.id, areaId)).limit(1);
  return rows[0] ?? null;
}

export async function findAreaByPlanAndZone(db: Db, sitePlanId: string, zoneId: string) {
  const rows = await db
    .select()
    .from(zoneMapAreas)
    .where(and(eq(zoneMapAreas.sitePlanId, sitePlanId), eq(zoneMapAreas.zoneId, zoneId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createArea(
  db: Db,
  sitePlanId: string,
  zoneId: string,
  geometry: PolygonGeometry,
) {
  const rows = await db
    .insert(zoneMapAreas)
    .values({ sitePlanId, zoneId, geometry })
    .returning();
  return rows[0]!;
}

export async function updateAreaGeometry(db: Db, areaId: string, geometry: PolygonGeometry) {
  const rows = await db
    .update(zoneMapAreas)
    .set({ geometry, updatedAt: new Date() })
    .where(eq(zoneMapAreas.id, areaId))
    .returning();
  return rows[0] ?? null;
}

export async function reassignAreaZone(db: Db, areaId: string, zoneId: string) {
  const rows = await db
    .update(zoneMapAreas)
    .set({ zoneId, updatedAt: new Date() })
    .where(eq(zoneMapAreas.id, areaId))
    .returning();
  return rows[0] ?? null;
}

export async function deleteArea(db: Db, areaId: string): Promise<boolean> {
  const rows = await db.delete(zoneMapAreas).where(eq(zoneMapAreas.id, areaId)).returning({ id: zoneMapAreas.id });
  return rows.length > 0;
}

export async function resetAreaToDefault(db: Db, areaId: string) {
  const area = await getAreaById(db, areaId);
  if (!area || !area.defaultGeometry) return null;
  const rows = await db
    .update(zoneMapAreas)
    .set({ geometry: area.defaultGeometry, updatedAt: new Date() })
    .where(eq(zoneMapAreas.id, areaId))
    .returning();
  return rows[0] ?? null;
}
