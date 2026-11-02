import { and, asc, between, eq, isNotNull, min, sql } from "drizzle-orm";
import { buildings, contractors, dailyReports, safetyFindings } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

const findingColumns = {
  id: safetyFindings.id,
  itemNo: safetyFindings.itemNo,
  weekStart: safetyFindings.weekStart,
  weekNo: safetyFindings.weekNo,
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
    .orderBy(asc(safetyFindings.weekStart), asc(safetyFindings.weekNo), asc(safetyFindings.itemNo));
}

export async function getFinding(db: Db, id: string) {
  const rows = await db.select().from(safetyFindings).where(eq(safetyFindings.id, id)).limit(1);
  return rows[0] ?? null;
}

// Next free number in the project (item_no) or in one ISO week (week_no). Computed inside the INSERT/UPDATE
// statement itself; two saves that race for the same number hit the unique key and the service retries.
const nextItemNo = (projectId: string) =>
  sql<number>`(select coalesce(max(${safetyFindings.itemNo}), 0) + 1 from ${safetyFindings} where ${safetyFindings.projectId} = ${projectId})`;
const nextWeekNo = (projectId: string, weekStart: string) =>
  sql<number>`(select coalesce(max(${safetyFindings.weekNo}), 0) + 1 from ${safetyFindings} where ${safetyFindings.projectId} = ${projectId} and ${safetyFindings.weekStart} = ${weekStart})`;

export type FindingValues = Omit<typeof safetyFindings.$inferInsert, "itemNo" | "weekNo">;

export async function insertFinding(db: Db, values: FindingValues, weekStart: string) {
  const rows = await db
    .insert(safetyFindings)
    .values({ ...values, itemNo: nextItemNo(values.projectId), weekNo: nextWeekNo(values.projectId, weekStart) })
    .returning({ id: safetyFindings.id });
  return rows[0]!.id;
}

// `moveToWeek` = the inspection date moved into another ISO week: take that week's next number.
export async function updateFinding(
  db: Db,
  id: string,
  values: Partial<FindingValues>,
  moveToWeek?: { projectId: string; weekStart: string },
) {
  await db
    .update(safetyFindings)
    .set({
      ...values,
      ...(moveToWeek ? { weekNo: nextWeekNo(moveToWeek.projectId, moveToWeek.weekStart) } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(safetyFindings.id, id));
}

// Close the gaps of one ISO week: 1..N by inspection date, then the old week number (entry order).
// Two passes (shift out of range, then number) because the unique key is checked row by row.
export async function renumberWeek(db: Db, projectId: string, weekStart: string) {
  return db.transaction(async (tx) => {
    const scope = and(eq(safetyFindings.projectId, projectId), eq(safetyFindings.weekStart, weekStart));
    await tx.update(safetyFindings).set({ weekNo: sql`${safetyFindings.weekNo} + 1000000` }).where(scope);
    const renumbered = await tx.execute(sql`
      update ${safetyFindings} f set week_no = n.rn, updated_at = now()
      from (
        select id, row_number() over (order by inspection_date, week_no, item_no) as rn
        from ${safetyFindings}
        where project_id = ${projectId} and week_start = ${weekStart}
      ) n
      where f.id = n.id
      returning f.id`);
    return renumbered.length;
  });
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
