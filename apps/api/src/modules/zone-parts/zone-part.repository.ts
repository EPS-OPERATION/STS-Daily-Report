import { asc, eq } from "drizzle-orm";
import { zoneParts, zones } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

export async function listProjectZoneParts(db: Db, projectId: string) {
  return db
    .select({
      id: zoneParts.id,
      zoneId: zoneParts.zoneId,
      code: zoneParts.code,
      name: zoneParts.name,
      displayColor: zoneParts.displayColor,
      mapX: zoneParts.mapX,
      mapY: zoneParts.mapY,
      sortOrder: zoneParts.sortOrder,
      isActive: zoneParts.isActive,
    })
    .from(zoneParts)
    .innerJoin(zones, eq(zoneParts.zoneId, zones.id))
    .where(eq(zones.projectId, projectId))
    .orderBy(asc(zones.sortOrder), asc(zones.code), asc(zoneParts.sortOrder), asc(zoneParts.code));
}

export async function listZoneParts(db: Db, zoneId: string) {
  return db
    .select()
    .from(zoneParts)
    .where(eq(zoneParts.zoneId, zoneId))
    .orderBy(asc(zoneParts.sortOrder), asc(zoneParts.code));
}

export async function getZonePartById(db: Db, id: string) {
  const rows = await db.select().from(zoneParts).where(eq(zoneParts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createZonePart(
  db: Db,
  zoneId: string,
  part: {
    code: string;
    facilityId?: string;
    name: string;
    displayColor: string;
    mapX: number | null;
    mapY: number | null;
    sortOrder: number;
    isActive: boolean;
  },
) {
  const rows = await db
    .insert(zoneParts)
    .values({ zoneId, ...part })
    .returning();
  return rows[0]!;
}

export async function updateZonePart(
  db: Db,
  id: string,
  part: {
    code: string;
    facilityId?: string;
    name: string;
    displayColor: string;
    mapX: number | null;
    mapY: number | null;
    sortOrder: number;
    isActive: boolean;
  },
) {
  const rows = await db
    .update(zoneParts)
    .set({ ...part, updatedAt: new Date() })
    .where(eq(zoneParts.id, id))
    .returning();
  return rows[0] ?? null;
}
