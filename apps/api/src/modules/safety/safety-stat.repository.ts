import { and, asc, between, eq, min, sql } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { safetyBaselines, safetyStatEntries, safetyStatYearOverrides } from "@/db/schema/index.js";

export type SafetyStatEntryInput = {
  date: string;
  nearMiss: number;
  inspections: number;
  lti: number;
  nonLti: number;
  propertyDamage: number;
  emergency: number;
  manHours: number;
  // Hand-written safety clock as of `date` (paper STATISTIC rows). null = use the automatic value.
  daysWithoutAccident?: number | null;
  highestDaysWithoutAccident?: number | null;
  note?: string | null;
};

export async function listSafetyStatEntries(db: Db, projectId: string, from: string, to: string) {
  return db
    .select()
    .from(safetyStatEntries)
    .where(and(eq(safetyStatEntries.projectId, projectId), between(safetyStatEntries.entryDate, from, to)))
    .orderBy(asc(safetyStatEntries.entryDate));
}

export async function getSafetyStatEntry(db: Db, projectId: string, date: string) {
  const rows = await db
    .select()
    .from(safetyStatEntries)
    .where(and(eq(safetyStatEntries.projectId, projectId), eq(safetyStatEntries.entryDate, date)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSafetyStatEntryById(db: Db, projectId: string, id: string) {
  const rows = await db
    .select()
    .from(safetyStatEntries)
    .where(and(eq(safetyStatEntries.projectId, projectId), eq(safetyStatEntries.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function firstSafetyStatDate(db: Db, projectId: string) {
  const rows = await db
    .select({ d: min(safetyStatEntries.entryDate) })
    .from(safetyStatEntries)
    .where(eq(safetyStatEntries.projectId, projectId));
  return rows[0]?.d ?? null;
}

export async function upsertSafetyStatEntry(
  db: Db,
  projectId: string,
  input: SafetyStatEntryInput,
  userId: string,
) {
  const [row] = await db
    .insert(safetyStatEntries)
    .values({
      projectId,
      entryDate: input.date,
      nearMiss: input.nearMiss,
      inspections: input.inspections,
      lti: input.lti,
      nonLti: input.nonLti,
      propertyDamage: input.propertyDamage,
      emergency: input.emergency,
      manHours: input.manHours,
      daysWithoutAccident: input.daysWithoutAccident ?? null,
      highestDaysWithoutAccident: input.highestDaysWithoutAccident ?? null,
      note: input.note?.trim() || null,
      createdBy: userId,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: [safetyStatEntries.projectId, safetyStatEntries.entryDate],
      set: {
        nearMiss: input.nearMiss,
        inspections: input.inspections,
        lti: input.lti,
        nonLti: input.nonLti,
        propertyDamage: input.propertyDamage,
        emergency: input.emergency,
        manHours: input.manHours,
        daysWithoutAccident: input.daysWithoutAccident ?? null,
        highestDaysWithoutAccident: input.highestDaysWithoutAccident ?? null,
        note: input.note?.trim() || null,
        updatedBy: userId,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: safetyStatEntries.id });
  return row!.id;
}

export async function deleteSafetyStatEntry(db: Db, projectId: string, id: string) {
  await db
    .delete(safetyStatEntries)
    .where(and(eq(safetyStatEntries.projectId, projectId), eq(safetyStatEntries.id, id)));
}

// Hand-written "Year YYYY" totals of the STATISTIC table, per category (EPS, from the paper form).
export async function listSafetyStatYearOverrides(db: Db, projectId: string, year: number) {
  const rows = await db
    .select()
    .from(safetyStatYearOverrides)
    .where(and(eq(safetyStatYearOverrides.projectId, projectId), eq(safetyStatYearOverrides.year, year)));
  return new Map(rows.map((r) => [r.code, r.value]));
}

export async function saveSafetyStatYearOverrides(
  db: Db,
  projectId: string,
  year: number,
  values: { code: string; value: number }[],
  userId: string,
  confirmedName: string | null,
) {
  for (const v of values) {
    await db
      .insert(safetyStatYearOverrides)
      .values({ projectId, year, code: v.code, value: v.value, confirmedName, updatedBy: userId })
      .onConflictDoUpdate({
        target: [safetyStatYearOverrides.projectId, safetyStatYearOverrides.year, safetyStatYearOverrides.code],
        set: { value: v.value, confirmedName, updatedBy: userId, updatedAt: sql`now()` },
      });
  }
}

// Safety history from before the app (see safety_baselines); null when EPS has not entered any.
export async function getSafetyBaseline(db: Db, projectId: string) {
  const [row] = await db.select().from(safetyBaselines).where(eq(safetyBaselines.projectId, projectId)).limit(1);
  return row ?? null;
}

export async function upsertSafetyBaseline(
  db: Db,
  projectId: string,
  input: { manHoursBefore: number; lastLtiDate: string | null; projectStartDate: string | null },
  userId: string,
  confirmedName: string | null,
) {
  const values = { manHoursBefore: input.manHoursBefore, lastLtiDate: input.lastLtiDate, projectStartDate: input.projectStartDate, confirmedName, updatedBy: userId, updatedAt: new Date() };
  const [row] = await db.insert(safetyBaselines).values({ projectId, ...values })
    .onConflictDoUpdate({ target: safetyBaselines.projectId, set: values }).returning();
  return row!;
}
