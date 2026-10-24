import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { buildingMarkers, buildingPartMarkers, buildingParts, buildings, dailyReportAllocations, type SiteMapView } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

// Active buildings only (pickers, validation). Summaries pass includeInactive so a hidden building's
// past man-days stay on the charts.
export async function listBuildings(db: Db, projectId: string, opts: { includeInactive?: boolean } = {}) {
  return db
    .select()
    .from(buildings)
    .where(opts.includeInactive ? eq(buildings.projectId, projectId) : and(eq(buildings.projectId, projectId), eq(buildings.status, "active")))
    .orderBy(asc(buildings.sortOrder), asc(buildings.code));
}

// Admin list: every building of the project with how many report activities use it.
export async function listBuildingsForAdmin(db: Db, projectId: string) {
  return db
    .select({
      id: buildings.id,
      code: buildings.code,
      name: buildings.name,
      nameTh: buildings.nameTh,
      sortOrder: buildings.sortOrder,
      status: buildings.status,
      usage: sql<number>`count(${dailyReportAllocations.id})::int`,
    })
    .from(buildings)
    .leftJoin(dailyReportAllocations, eq(dailyReportAllocations.buildingId, buildings.id))
    .where(eq(buildings.projectId, projectId))
    .groupBy(buildings.id)
    .orderBy(asc(buildings.sortOrder), asc(buildings.code));
}

export async function findBuildingByCode(db: Db, projectId: string, code: string) {
  const rows = await db
    .select({ id: buildings.id })
    .from(buildings)
    .where(and(eq(buildings.projectId, projectId), sql`lower(${buildings.code}) = lower(${code})`))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertBuilding(db: Db, projectId: string, input: { code: string; name: string; nameTh: string | null }) {
  // New buildings go to the end of the list.
  const [last] = await db
    .select({ max: sql<number>`coalesce(max(${buildings.sortOrder}), -1)::int` })
    .from(buildings)
    .where(eq(buildings.projectId, projectId));
  const rows = await db.insert(buildings).values({ projectId, ...input, sortOrder: (last?.max ?? -1) + 1 }).returning();
  return rows[0]!;
}

export async function updateBuilding(db: Db, id: string, input: { code?: string; name?: string; nameTh?: string | null; status?: string }) {
  const rows = await db.update(buildings).set({ ...input, updatedAt: sql`now()` }).where(eq(buildings.id, id)).returning();
  return rows[0] ?? null;
}

export async function setBuildingOrder(db: Db, projectId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx.update(buildings).set({ sortOrder: i, updatedAt: sql`now()` }).where(and(eq(buildings.id, id), eq(buildings.projectId, projectId)));
    }
  });
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
