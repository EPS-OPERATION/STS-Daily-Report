import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { buildingMarkers, buildingPartMarkers, buildingParts, buildings, type SiteMapView } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

export async function listBuildings(db: Db, projectId: string) {
  return db
    .select()
    .from(buildings)
    .where(and(eq(buildings.projectId, projectId), eq(buildings.status, "active")))
    .orderBy(asc(buildings.sortOrder), asc(buildings.code));
}

export async function listBuildingsByIds(db: Db, projectId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: buildings.id })
    .from(buildings)
    .where(and(eq(buildings.projectId, projectId), inArray(buildings.id, ids)));
}

export async function getBuilding(db: Db, id: string) {
  const rows = await db.select().from(buildings).where(eq(buildings.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listMarkers(db: Db, projectId: string) {
  return db
    .select({ buildingId: buildingMarkers.buildingId, view: buildingMarkers.view, x: buildingMarkers.x, y: buildingMarkers.y })
    .from(buildingMarkers)
    .innerJoin(buildings, eq(buildingMarkers.buildingId, buildings.id))
    .where(eq(buildings.projectId, projectId));
}

export async function upsertMarker(db: Db, buildingId: string, view: SiteMapView, x: number, y: number, userId: string) {
  await db
    .insert(buildingMarkers)
    .values({ buildingId, view, x, y, updatedBy: userId })
    .onConflictDoUpdate({
      target: [buildingMarkers.buildingId, buildingMarkers.view],
      set: { x, y, updatedBy: userId, updatedAt: sql`now()` },
    });
}

export async function deleteMarker(db: Db, buildingId: string, view: SiteMapView) {
  await db.delete(buildingMarkers).where(and(eq(buildingMarkers.buildingId, buildingId), eq(buildingMarkers.view, view)));
}

export async function listParts(db: Db, projectId: string) {
  return db
    .select({
      id: buildingParts.id,
      buildingId: buildingParts.buildingId,
      code: buildingParts.code,
      name: buildingParts.name,
      status: buildingParts.status,
      sortOrder: buildingParts.sortOrder,
    })
    .from(buildingParts)
    .innerJoin(buildings, eq(buildingParts.buildingId, buildings.id))
    .where(eq(buildings.projectId, projectId))
    .orderBy(asc(buildingParts.sortOrder), asc(buildingParts.code));
}

export async function listPartMarkers(db: Db, projectId: string) {
  return db
    .select({ partId: buildingPartMarkers.partId, view: buildingPartMarkers.view, x: buildingPartMarkers.x, y: buildingPartMarkers.y })
    .from(buildingPartMarkers)
    .innerJoin(buildingParts, eq(buildingPartMarkers.partId, buildingParts.id))
    .innerJoin(buildings, eq(buildingParts.buildingId, buildings.id))
    .where(eq(buildings.projectId, projectId));
}

export async function getPart(db: Db, id: string) {
  const rows = await db
    .select({ id: buildingParts.id, buildingId: buildingParts.buildingId, projectId: buildings.projectId, code: buildingParts.code })
    .from(buildingParts)
    .innerJoin(buildings, eq(buildingParts.buildingId, buildings.id))
    .where(eq(buildingParts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPartByCode(db: Db, buildingId: string, code: string) {
  const rows = await db
    .select({ id: buildingParts.id })
    .from(buildingParts)
    .where(and(eq(buildingParts.buildingId, buildingId), eq(buildingParts.code, code)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertPart(db: Db, values: typeof buildingParts.$inferInsert) {
  const rows = await db.insert(buildingParts).values(values).returning({ id: buildingParts.id });
  return rows[0]!.id;
}

export async function updatePart(db: Db, id: string, values: Partial<typeof buildingParts.$inferInsert>) {
  await db.update(buildingParts).set({ ...values, updatedAt: sql`now()` }).where(eq(buildingParts.id, id));
}

export async function deletePart(db: Db, id: string) {
  await db.delete(buildingParts).where(eq(buildingParts.id, id));
}

export async function upsertPartMarker(db: Db, partId: string, view: SiteMapView, x: number, y: number) {
  await db
    .insert(buildingPartMarkers)
    .values({ partId, view, x, y })
    .onConflictDoUpdate({ target: [buildingPartMarkers.partId, buildingPartMarkers.view], set: { x, y, updatedAt: sql`now()` } });
}

export async function deletePartMarker(db: Db, partId: string, view: SiteMapView) {
  await db.delete(buildingPartMarkers).where(and(eq(buildingPartMarkers.partId, partId), eq(buildingPartMarkers.view, view)));
}
