import { and, asc, eq } from "drizzle-orm";
import type { QueryDb as Db } from "@/db/client.js";
import { reportStandardItems } from "@/db/schema/index.js";

export type NewStandardItemRow = typeof reportStandardItems.$inferInsert;

export async function listStandardItems(db: Db, projectId: string, contractorId: string) {
  return db
    .select()
    .from(reportStandardItems)
    .where(and(eq(reportStandardItems.projectId, projectId), eq(reportStandardItems.contractorId, contractorId)))
    .orderBy(asc(reportStandardItems.kind), asc(reportStandardItems.createdAt));
}

export async function findStandardItem(db: Db, id: string) {
  const [row] = await db.select().from(reportStandardItems).where(eq(reportStandardItems.id, id)).limit(1);
  return row ?? null;
}

export async function insertStandardItems(db: Db, rows: NewStandardItemRow[]) {
  if (rows.length === 0) return;
  await db.insert(reportStandardItems).values(rows);
}

export async function deleteStandardItem(db: Db, id: string) {
  await db.delete(reportStandardItems).where(eq(reportStandardItems.id, id));
}
