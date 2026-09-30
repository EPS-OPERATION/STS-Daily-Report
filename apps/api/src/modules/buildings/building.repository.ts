import { and, asc, eq, inArray } from "drizzle-orm";
import { buildings } from "@/db/schema/index.js";
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
