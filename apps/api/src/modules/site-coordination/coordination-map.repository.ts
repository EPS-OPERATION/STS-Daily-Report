import { and, asc, count, eq, max, sql } from "drizzle-orm";
import type { QueryDb } from "@/db/client.js";
import { coordinationItems, coordinationMaps } from "@/db/schema/index.js";

export type MapRow = typeof coordinationMaps.$inferSelect;

// Every map of the project with how many jobs (any date) and route sections sit on it.
export async function listMapsWithCounts(db: QueryDb, projectId: string) {
  return db
    .select({
      map: coordinationMaps,
      // Spelled out with table names: drizzle leaves columns unqualified here, and a bare "id" would mean the inner table's.
      jobCount: sql<number>`(select count(*)::int from coordination_items ci where ci.map_id = coordination_maps.id)`,
      sectionCount: sql<number>`(select count(*)::int from coordination_sections cs where cs.map_id = coordination_maps.id)`,
    })
    .from(coordinationMaps)
    .where(eq(coordinationMaps.projectId, projectId))
    .orderBy(asc(coordinationMaps.sortOrder), asc(coordinationMaps.createdAt), asc(coordinationMaps.id));
}

export async function nextMapSortOrder(db: QueryDb, projectId: string) {
  const [row] = await db.select({ top: max(coordinationMaps.sortOrder) }).from(coordinationMaps).where(eq(coordinationMaps.projectId, projectId));
  return (row?.top ?? 0) + 10;
}

export async function findMapByName(db: QueryDb, projectId: string, name: string, exceptId?: string) {
  const rows = await db.select({ id: coordinationMaps.id }).from(coordinationMaps)
    .where(and(eq(coordinationMaps.projectId, projectId), sql`lower(${coordinationMaps.name}) = lower(${name})`));
  return rows.find((r) => r.id !== exceptId) ?? null;
}

export async function insertMap(db: QueryDb, values: typeof coordinationMaps.$inferInsert) {
  const [row] = await db.insert(coordinationMaps).values(values).returning();
  return row!;
}

export async function updateMap(db: QueryDb, projectId: string, id: string, patch: Partial<Pick<MapRow, "name" | "nameTh" | "imagePath" | "objectKey" | "width" | "height">>) {
  const [row] = await db.update(coordinationMaps).set(patch).where(and(eq(coordinationMaps.projectId, projectId), eq(coordinationMaps.id, id))).returning();
  return row ?? null;
}

export async function deleteMap(db: QueryDb, projectId: string, id: string) {
  await db.delete(coordinationMaps).where(and(eq(coordinationMaps.projectId, projectId), eq(coordinationMaps.id, id)));
}

export async function countJobsOnMap(db: QueryDb, id: string) {
  const [row] = await db.select({ n: count() }).from(coordinationItems).where(eq(coordinationItems.mapId, id));
  return row?.n ?? 0;
}

// Rewrites sort_order 0, 10, 20 … in the given order (all ids belong to the project).
export async function reorderMaps(db: QueryDb, projectId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(coordinationMaps).set({ sortOrder: index * 10 }).where(and(eq(coordinationMaps.projectId, projectId), eq(coordinationMaps.id, id)));
    }
  });
}
