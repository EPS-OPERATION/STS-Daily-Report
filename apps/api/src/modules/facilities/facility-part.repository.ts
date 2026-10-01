import { and, asc, eq } from "drizzle-orm";
import type { DbExecutor } from "@/db/client.js";
import { zoneParts as facilityParts } from "@/db/schema/index.js";
import type { FacilityStatusFilter } from "./facility.type.js";
import type { CreateFacilityPartInput, UpdateFacilityPartInput } from "./facility-part.type.js";

const partFields = {
  id: facilityParts.id,
  facilityId: facilityParts.facilityId,
  code: facilityParts.code,
  name: facilityParts.name,
  sortOrder: facilityParts.sortOrder,
  isActive: facilityParts.isActive,
  createdAt: facilityParts.createdAt,
  updatedAt: facilityParts.updatedAt,
};

export function listFacilityParts(db: DbExecutor, facilityId: string, status: FacilityStatusFilter = "active") {
  const conditions = [eq(facilityParts.facilityId, facilityId)];
  if (status !== "all") conditions.push(eq(facilityParts.isActive, status === "active"));
  return db
    .select(partFields)
    .from(facilityParts)
    .where(and(...conditions))
    .orderBy(asc(facilityParts.sortOrder), asc(facilityParts.code), asc(facilityParts.id));
}

export async function getFacilityPart(db: DbExecutor, id: string) {
  return (await db.select(partFields).from(facilityParts).where(eq(facilityParts.id, id)).limit(1))[0] ?? null;
}

export async function getFacilityPartRecord(db: DbExecutor, id: string) {
  return (await db.select().from(facilityParts).where(eq(facilityParts.id, id)).limit(1))[0] ?? null;
}

export async function createFacilityPart(db: DbExecutor, facilityId: string, input: CreateFacilityPartInput) {
  return (
    await db
      .insert(facilityParts)
      .values({ ...input, facilityId })
      .returning(partFields)
  )[0]!;
}

export async function updateFacilityPart(db: DbExecutor, id: string, input: UpdateFacilityPartInput) {
  return (
    (
      await db
        .update(facilityParts)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(facilityParts.id, id))
        .returning(partFields)
    )[0] ?? null
  );
}
