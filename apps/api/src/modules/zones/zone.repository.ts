import { and, asc, eq } from "drizzle-orm";
import { zones } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

export async function listZones(db: Db, projectId: string, status?: string) {
  const conditions = [eq(zones.projectId, projectId)];
  if (status && status !== "all") conditions.push(eq(zones.status, status));
  return db
    .select()
    .from(zones)
    .where(and(...conditions))
    .orderBy(asc(zones.sortOrder), asc(zones.code));
}

export async function getZoneById(db: Db, id: string) {
  const rows = await db.select().from(zones).where(eq(zones.id, id)).limit(1);
  return rows[0] ?? null;
}
