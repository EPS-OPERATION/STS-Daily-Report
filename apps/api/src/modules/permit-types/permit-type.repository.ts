import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { permitTypes, type NewPermitTypeRow, type PermitTypeRow } from "@/db/schema/permit-type.schema.js";

export async function listPermitTypes(db: Db, projectId: string, includeInactive = false): Promise<PermitTypeRow[]> {
  const conditions = [eq(permitTypes.projectId, projectId)];
  if (!includeInactive) {
    conditions.push(eq(permitTypes.isActive, true));
  }
  return db
    .select()
    .from(permitTypes)
    .where(and(...conditions))
    .orderBy(asc(permitTypes.sortOrder), asc(permitTypes.code));
}

export async function findPermitTypeById(db: Db, id: string): Promise<PermitTypeRow | null> {
  const rows = await db.select().from(permitTypes).where(eq(permitTypes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findPermitTypeByCode(db: Db, projectId: string, code: string): Promise<PermitTypeRow | null> {
  const rows = await db
    .select()
    .from(permitTypes)
    .where(and(eq(permitTypes.projectId, projectId), eq(permitTypes.code, code)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertPermitType(db: Db, values: NewPermitTypeRow): Promise<PermitTypeRow> {
  const rows = await db.insert(permitTypes).values(values).returning();
  return rows[0]!;
}

export async function updatePermitType(db: Db, id: string, values: Partial<NewPermitTypeRow>): Promise<PermitTypeRow> {
  const rows = await db
    .update(permitTypes)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(permitTypes.id, id))
    .returning();
  return rows[0]!;
}

export async function deletePermitType(db: Db, id: string): Promise<void> {
  await db.delete(permitTypes).where(eq(permitTypes.id, id));
}
