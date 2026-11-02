import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { rainLogs, users } from "@/db/schema/index.js";

export type RainLogRow = typeof rainLogs.$inferInsert;

const columns = {
  id: rainLogs.id,
  projectId: rainLogs.projectId,
  date: rainLogs.logDate,
  startTime: rainLogs.startTime,
  endTime: rainLogs.endTime,
  stoppageHours: rainLogs.stoppageHours,
  intensity: rainLogs.intensity,
  rainfallMm: rainLogs.rainfallMm,
  impactSummary: rainLogs.impactSummary,
  delayClaimNote: rainLogs.delayClaimNote,
  recordedByName: users.displayName,
  createdAt: rainLogs.createdAt,
  updatedAt: rainLogs.updatedAt,
};

export async function listRainLogs(db: Db, projectId: string, from: string, to: string) {
  return db
    .select(columns)
    .from(rainLogs)
    .leftJoin(users, eq(rainLogs.recordedBy, users.id))
    .where(and(eq(rainLogs.projectId, projectId), gte(rainLogs.logDate, from), lte(rainLogs.logDate, to)))
    .orderBy(desc(rainLogs.logDate), asc(rainLogs.startTime));
}

export async function insertRainLog(db: Db, row: RainLogRow) {
  const [r] = await db.insert(rainLogs).values(row).returning({ id: rainLogs.id });
  return r!.id;
}

export async function updateRainLog(db: Db, projectId: string, id: string, patch: Partial<RainLogRow>) {
  const rows = await db
    .update(rainLogs)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(rainLogs.projectId, projectId), eq(rainLogs.id, id)))
    .returning({ id: rainLogs.id });
  return rows[0]?.id ?? null;
}

export async function deleteRainLog(db: Db, projectId: string, id: string) {
  const rows = await db.delete(rainLogs).where(and(eq(rainLogs.projectId, projectId), eq(rainLogs.id, id))).returning({ id: rainLogs.id });
  return rows.length > 0;
}
