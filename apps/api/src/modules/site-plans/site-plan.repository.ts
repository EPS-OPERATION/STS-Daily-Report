import { and, asc, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { siteMarkerDefinitions, sitePlans, zoneMapAreas, zoneMapPoints, zones } from "@/db/schema/index.js";
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
        displayColor: zones.displayColor,
        defaultDisplayColor: zones.defaultDisplayColor,
      },
      geometry: zoneMapAreas.geometry,
      defaultGeometry: zoneMapAreas.defaultGeometry,
    })
    .from(zoneMapAreas)
    .innerJoin(zones, eq(zoneMapAreas.zoneId, zones.id))
    .where(eq(zoneMapAreas.sitePlanId, sitePlanId))
    .orderBy(asc(zones.sortOrder), asc(zones.code));
}

export async function listPointRowsForPlan(db: Db, sitePlanId: string) {
  return db
    .select({
      id: zoneMapPoints.id,
      zoneId: zoneMapPoints.zoneId,
      view: zoneMapPoints.view,
      x: zoneMapPoints.x,
      y: zoneMapPoints.y,
      zone: {
        id: zones.id,
        code: zones.code,
        name: zones.name,
        parentId: zones.parentId,
        sortOrder: zones.sortOrder,
        displayColor: zones.displayColor,
        defaultDisplayColor: zones.defaultDisplayColor,
      },
    })
    .from(zoneMapPoints)
    .innerJoin(zones, eq(zoneMapPoints.zoneId, zones.id))
    .where(eq(zoneMapPoints.sitePlanId, sitePlanId))
    .orderBy(asc(zones.sortOrder), asc(zones.code));
}

export async function listMarkerDefinitionsForPlan(db: Db, sitePlanId: string) {
  return db
    .select()
    .from(siteMarkerDefinitions)
    .where(eq(siteMarkerDefinitions.sitePlanId, sitePlanId))
    .orderBy(asc(siteMarkerDefinitions.no));
}

export async function listLegacyAreasWithoutPointForPlan(db: Db, sitePlanId: string, parentZoneIds: string[]) {
  const conditions = [eq(zoneMapAreas.sitePlanId, sitePlanId), isNull(zoneMapPoints.id)];
  if (parentZoneIds.length > 0) conditions.push(notInArray(zones.id, parentZoneIds));
  return db
    .select({
      id: zoneMapAreas.id,
      zone: {
        id: zones.id,
        code: zones.code,
        name: zones.name,
        parentId: zones.parentId,
        sortOrder: zones.sortOrder,
        displayColor: zones.displayColor,
        defaultDisplayColor: zones.defaultDisplayColor,
      },
      geometry: zoneMapAreas.geometry,
    })
    .from(zoneMapAreas)
    .innerJoin(zones, eq(zoneMapAreas.zoneId, zones.id))
    .leftJoin(
      zoneMapPoints,
      and(
        eq(zoneMapPoints.sitePlanId, zoneMapAreas.sitePlanId),
        eq(zoneMapPoints.zoneId, zoneMapAreas.zoneId),
        eq(zoneMapPoints.view, "top"),
      ),
    )
    .where(and(...conditions));
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

export async function saveMapPointRows(
  db: Db,
  sitePlanId: string,
  points: { zoneId: string; view: "overview" | "top"; x: number | null; y: number | null }[],
) {
  if (points.length === 0) return;
  await db
    .insert(zoneMapPoints)
    .values(points.map((point) => ({ sitePlanId, ...point })))
    .onConflictDoUpdate({
      target: [zoneMapPoints.sitePlanId, zoneMapPoints.zoneId, zoneMapPoints.view],
      set: { x: sql`excluded.x`, y: sql`excluded.y`, updatedAt: new Date() },
    });
}

export async function saveMarkerPositions(
  db: Db,
  sitePlanId: string,
  markers: { facilityKey: string; view: "overview" | "top"; x: number | null; y: number | null }[],
) {
  for (const marker of markers) {
    const position =
      marker.view === "overview"
        ? { overviewX: marker.x, overviewY: marker.y }
        : { topViewX: marker.x, topViewY: marker.y };
    await db
      .update(siteMarkerDefinitions)
      .set(position)
      .where(and(eq(siteMarkerDefinitions.sitePlanId, sitePlanId), eq(siteMarkerDefinitions.key, marker.facilityKey)));
  }
}
