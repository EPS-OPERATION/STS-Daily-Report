import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { droneLogs } from "@/db/schema/index.js";

export async function listDroneLogs(db: Db, projectId: string, from?: string, to?: string) {
  const conditions = [eq(droneLogs.projectId, projectId)];
  if (from) conditions.push(gte(droneLogs.logDate, from));
  if (to) conditions.push(lte(droneLogs.logDate, to));
  return db
    .select()
    .from(droneLogs)
    .where(and(...conditions))
    .orderBy(asc(droneLogs.logDate));
}

export async function getDroneLog(db: Db, id: string) {
  const rows = await db.select().from(droneLogs).where(eq(droneLogs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertDroneLog(
  db: Db,
  values: {
    projectId: string;
    logDate: string;
    title: string;
    description: string;
    capturedBy: string;
    tags: string[];
    objectKey: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    createdBy: string | null;
  },
) {
  const rows = await db.insert(droneLogs).values(values).returning();
  return rows[0]!;
}

export async function deleteDroneLog(db: Db, id: string) {
  const rows = await db
    .delete(droneLogs)
    .where(eq(droneLogs.id, id))
    .returning({ id: droneLogs.id, objectKey: droneLogs.objectKey });
  return rows[0] ?? null;
}
