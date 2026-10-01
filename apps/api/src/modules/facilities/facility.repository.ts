import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { facilities } from "@/db/schema/index.js";
import type { DbExecutor } from "@/db/client.js";
import type { CreateFacilityInput, FacilityStatusFilter, UpdateFacilityInput } from "./facility.type.js";

// This DTO deliberately omits the internal legacy Zone association.
export const facilityFields = {
  id: facilities.id,
  projectId: facilities.projectId,
  key: facilities.key,
  name: facilities.name,
  code: facilities.code,
  sortOrder: facilities.sortOrder,
  isActive: facilities.isActive,
  createdAt: facilities.createdAt,
  updatedAt: facilities.updatedAt,
};

export async function listFacilities(
  db: DbExecutor,
  projectId: string,
  status: FacilityStatusFilter = "active",
  search?: string,
) {
  const conditions = [eq(facilities.projectId, projectId)];
  if (status !== "all") conditions.push(eq(facilities.isActive, status === "active"));
  if (search?.trim())
    conditions.push(or(ilike(facilities.name, `%${search.trim()}%`), ilike(facilities.code, `%${search.trim()}%`))!);
  return db
    .select(facilityFields)
    .from(facilities)
    .where(and(...conditions))
    .orderBy(asc(facilities.sortOrder), asc(facilities.name), asc(facilities.id));
}

export async function getFacility(db: DbExecutor, id: string) {
  return (await db.select(facilityFields).from(facilities).where(eq(facilities.id, id)).limit(1))[0] ?? null;
}

export async function getFacilityRecord(db: DbExecutor, id: string) {
  return (await db.select().from(facilities).where(eq(facilities.id, id)).limit(1))[0] ?? null;
}

export async function getFacilityRecordsByIds(db: DbExecutor, ids: string[]) {
  return ids.length ? db.select().from(facilities).where(inArray(facilities.id, ids)) : [];
}

export function getFacilitiesForLegacyZone(db: DbExecutor, projectId: string, zoneId: string) {
  return db
    .select()
    .from(facilities)
    .where(and(eq(facilities.projectId, projectId), eq(facilities.legacyZoneId, zoneId)))
    .limit(2);
}

export async function createFacility(db: DbExecutor, projectId: string, input: CreateFacilityInput) {
  const id = crypto.randomUUID();
  return (
    await db
      .insert(facilities)
      .values({ ...input, id, projectId, key: "facility-" + id })
      .returning(facilityFields)
  )[0]!;
}

export async function updateFacility(db: DbExecutor, id: string, input: UpdateFacilityInput) {
  return (
    (
      await db
        .update(facilities)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(facilities.id, id))
        .returning(facilityFields)
    )[0] ?? null
  );
}
