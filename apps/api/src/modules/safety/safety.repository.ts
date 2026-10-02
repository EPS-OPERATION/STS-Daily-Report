import { and, asc, between, eq, isNotNull, max, min, sql } from "drizzle-orm";
import { buildings, contractors, dailyReports, safetyFindings } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

const findingColumns = {
  id: safetyFindings.id,
  itemNo: safetyFindings.itemNo,
  observation: safetyFindings.observation,
  buildingId: safetyFindings.buildingId,
  buildingCode: buildings.code,
  buildingName: buildings.name,
  locationDetail: safetyFindings.locationDetail,
  actionToBeTaken: safetyFindings.actionToBeTaken,
  contractorId: safetyFindings.contractorId,
  contractorCode: contractors.code,
  contractorName: contractors.name,
  inspectionDate: safetyFindings.inspectionDate,
  expectedCompleteDate: safetyFindings.expectedCompleteDate,
  status: safetyFindings.status,
  findingType: safetyFindings.findingType,
  findingPhotoKey: safetyFindings.findingPhotoKey,
  closePhotoKey: safetyFindings.closePhotoKey,
  closedAt: safetyFindings.closedAt,
};

function findingQuery(db: Db) {
  return db
    .select(findingColumns)
    .from(safetyFindings)
    .leftJoin(buildings, eq(safetyFindings.buildingId, buildings.id))
    .leftJoin(contractors, eq(safetyFindings.contractorId, contractors.id));
}

export type FindingRow = Awaited<ReturnType<typeof listFindings>>[number];

export async function listFindings(db: Db, projectId: string, from: string, to: string) {
  return findingQuery(db)
    .where(and(eq(safetyFindings.projectId, projectId), between(safetyFindings.inspectionDate, from, to)))
    .orderBy(asc(safetyFindings.inspectionDate), asc(safetyFindings.itemNo));
}

export async function getFinding(db: Db, id: string) {
  const rows = await db.select().from(safetyFindings).where(eq(safetyFindings.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function nextItemNo(db: Db, projectId: string) {
  const rows = await db.select({ n: max(safetyFindings.itemNo) }).from(safetyFindings).where(eq(safetyFindings.projectId, projectId));
  return (rows[0]?.n ?? 0) + 1;
}

export async function insertFinding(db: Db, values: typeof safetyFindings.$inferInsert) {
  const rows = await db.insert(safetyFindings).values(values).returning({ id: safetyFindings.id });
  return rows[0]!.id;
}

export async function updateFinding(db: Db, id: string, values: Partial<typeof safetyFindings.$inferInsert>) {
  await db.update(safetyFindings).set({ ...values, updatedAt: sql`now()` }).where(eq(safetyFindings.id, id));
}

export async function deleteFinding(db: Db, id: string) {
  await db.delete(safetyFindings).where(eq(safetyFindings.id, id));
}

// Accidents reported by contractors in the evening report (categorised).
export async function listAccidents(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({ reportDate: dailyReports.reportDate, category: dailyReports.accidentCategory, contractorCode: contractors.code })
    .from(dailyReports)
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.accidentOccurred, true),
        isNotNull(dailyReports.accidentCategory),
        between(dailyReports.reportDate, from, to),
      ),
    )
    .orderBy(asc(dailyReports.reportDate));
}

// First day anyone reported — the start of the project's safety clock.
export async function firstReportDate(db: Db, projectId: string) {
  const rows = await db.select({ d: min(dailyReports.reportDate) }).from(dailyReports).where(eq(dailyReports.projectId, projectId));
  return rows[0]?.d ?? null;
}
