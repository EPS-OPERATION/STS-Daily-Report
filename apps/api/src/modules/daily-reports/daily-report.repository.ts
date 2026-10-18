import { and, asc, between, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db, QueryDb } from "@/db/client.js";
import { buildings, contractors, dailyReportAllocations, dailyReportCrews, dailyReportEquipment, dailyReportMaterials, dailyReportOvertime, dailyReportPhotos, dailyReportPositions, dailyReports } from "@/db/schema/index.js";

export async function getReportById(db: QueryDb, id: string) {
  const rows = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getReportByKey(db: QueryDb, projectId: string, contractorId: string, reportDate: string) {
  const rows = await db
    .select()
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.contractorId, contractorId),
        eq(dailyReports.reportDate, reportDate),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listAllocations(db: Db, reportId: string) {
  return db
    .select({
      id: dailyReportAllocations.id,
      buildingId: dailyReportAllocations.buildingId,
      buildingCode: buildings.code,
      buildingName: buildings.name,
      discipline: dailyReportAllocations.discipline,
      headcount: dailyReportAllocations.headcount,
      workDescription: dailyReportAllocations.workDescription,
      startTime: dailyReportAllocations.startTime,
      endTime: dailyReportAllocations.endTime,
      dayShare: dailyReportAllocations.dayShare,
      planPercent: dailyReportAllocations.planPercent,
      actualPercent: dailyReportAllocations.actualPercent,
      countermeasure: dailyReportAllocations.countermeasure,
    })
    .from(dailyReportAllocations)
    .innerJoin(buildings, eq(dailyReportAllocations.buildingId, buildings.id))
    .where(eq(dailyReportAllocations.reportId, reportId))
    .orderBy(asc(dailyReportAllocations.sortOrder));
}

// Creates an empty draft row for (project, contractor, date) so photos can attach
// before either shift is sent. Never touches an existing row.
export async function ensureReport(db: Db, projectId: string, contractorId: string, reportDate: string) {
  await db.insert(dailyReports).values({ projectId, contractorId, reportDate }).onConflictDoNothing();
  return (await getReportByKey(db, projectId, contractorId, reportDate))!;
}

// EPS review decision on a submitted report (service owns the role/transition rules).
export async function setReportReview(
  db: Db,
  reportId: string,
  review: { status: "approved" | "rejected"; note: string | null; userId: string },
) {
  const now = new Date();
  await db
    .update(dailyReports)
    .set({ reviewStatus: review.status, reviewNote: review.note, reviewedBy: review.userId, reviewedAt: now, updatedAt: now })
    .where(eq(dailyReports.id, reportId));
}

// EPS review queue: one row per contractor report for a date or date range (headcount +
// both shift states + review decision). Caller scopes contractorIds by role.
export async function listReportsForReview(
  db: Db,
  projectId: string,
  range: { date?: string; from?: string; to?: string } | string,
  contractorIds?: string[],
) {
  const r = typeof range === "string" ? { date: range } : range;
  const from = r.from ?? r.date;
  const to = r.to ?? r.date ?? from;
  return db
    .select({
      id: dailyReports.id,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      reportDate: dailyReports.reportDate,
      morningStatus: dailyReports.morningStatus,
      eveningStatus: dailyReports.eveningStatus,
      thaiMale: dailyReports.thaiMale,
      thaiFemale: dailyReports.thaiFemale,
      foreignMale: dailyReports.foreignMale,
      foreignFemale: dailyReports.foreignFemale,
      eveningThaiMale: dailyReports.eveningThaiMale,
      eveningThaiFemale: dailyReports.eveningThaiFemale,
      eveningForeignMale: dailyReports.eveningForeignMale,
      eveningForeignFemale: dailyReports.eveningForeignFemale,
      reviewStatus: dailyReports.reviewStatus,
      reviewNote: dailyReports.reviewNote,
      reviewedAt: dailyReports.reviewedAt,
      morningSubmittedAt: dailyReports.morningSubmittedAt,
      morningUpdatedAt: dailyReports.morningUpdatedAt,
      eveningSubmittedAt: dailyReports.eveningSubmittedAt,
      eveningUpdatedAt: dailyReports.eveningUpdatedAt,
      updatedAt: dailyReports.updatedAt,
      startTime: dailyReports.startTime,
      endTime: dailyReports.endTime,
      workHours: dailyReports.workHours,
      otHours: dailyReports.otHours,
      otManHours: dailyReports.otManHours,
    })
    .from(dailyReports)
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        from && to
          ? between(dailyReports.reportDate, from, to)
          : from
            ? eq(dailyReports.reportDate, from)
            : undefined,
        contractorIds && contractorIds.length > 0 ? inArray(dailyReports.contractorId, contractorIds) : undefined,
      ),
    )
    .orderBy(desc(dailyReports.reportDate), contractors.code);
}

// Headcount per position, summed over disciplines (what dashboards and the print form read).
export async function listPositions(db: Db, reportId: string, shift: "morning" | "evening" = "morning") {
  return db
    .select({
      position: dailyReportPositions.position,
      headcount: sql<number>`sum(${dailyReportPositions.headcount})`.mapWith(Number),
    })
    .from(dailyReportPositions)
    .where(and(eq(dailyReportPositions.reportId, reportId), eq(dailyReportPositions.shift, shift)))
    .groupBy(dailyReportPositions.position)
    .orderBy(asc(dailyReportPositions.position));
}

// Every discipline crew of the report (both shifts): positions + nationality/sex split.
export async function listCrews(db: Db, reportId: string) {
  const [positions, splits] = await Promise.all([
    db
      .select({
        shift: dailyReportPositions.shift,
        discipline: dailyReportPositions.discipline,
        position: dailyReportPositions.position,
        headcount: dailyReportPositions.headcount,
      })
      .from(dailyReportPositions)
      .where(eq(dailyReportPositions.reportId, reportId)),
    db.select().from(dailyReportCrews).where(eq(dailyReportCrews.reportId, reportId)),
  ]);
  return splits.map((c) => ({
    shift: c.shift as "morning" | "evening",
    discipline: c.discipline,
    positions: positions
      .filter((p) => p.shift === c.shift && p.discipline === c.discipline)
      .map((p) => ({ position: p.position, headcount: p.headcount })),
    thaiMale: c.thaiMale,
    thaiFemale: c.thaiFemale,
    foreignMale: c.foreignMale,
    foreignFemale: c.foreignFemale,
  }));
}

export async function listEquipment(db: Db, reportId: string) {
  return db
    .select({ equipmentType: dailyReportEquipment.equipmentType, qty: dailyReportEquipment.qty })
    .from(dailyReportEquipment)
    .where(eq(dailyReportEquipment.reportId, reportId))
    .orderBy(asc(dailyReportEquipment.equipmentType));
}

export async function listMaterials(db: Db, reportId: string) {
  const rows = await db
    .select({
      materialName: dailyReportMaterials.materialName,
      qty: dailyReportMaterials.qty,
      unit: dailyReportMaterials.unit,
    })
    .from(dailyReportMaterials)
    .where(eq(dailyReportMaterials.reportId, reportId))
    .orderBy(asc(dailyReportMaterials.materialName));
  return rows.map((r) => ({ materialName: r.materialName, qty: Number(r.qty), unit: r.unit }));
}

export async function listPhotos(db: Db, reportId: string) {
  return db
    .select()
    .from(dailyReportPhotos)
    .where(eq(dailyReportPhotos.reportId, reportId))
    .orderBy(asc(dailyReportPhotos.createdAt));
}

export async function countPhotos(db: Db, reportId: string) {
  const rows = await db
    .select({ n: count() })
    .from(dailyReportPhotos)
    .where(eq(dailyReportPhotos.reportId, reportId));
  return rows[0]?.n ?? 0;
}

export async function getPhoto(db: Db, reportId: string, photoId: string) {
  const rows = await db
    .select()
    .from(dailyReportPhotos)
    .where(and(eq(dailyReportPhotos.id, photoId), eq(dailyReportPhotos.reportId, reportId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertPhoto(db: Db, values: typeof dailyReportPhotos.$inferInsert) {
  const rows = await db.insert(dailyReportPhotos).values(values).returning();
  return rows[0]!;
}

export async function deletePhoto(db: Db, photoId: string) {
  await db.delete(dailyReportPhotos).where(eq(dailyReportPhotos.id, photoId));
}

// Accident record for the printed report: how many accident days this contractor reported up
// to `date`, the last one, and the first report (start of the "we have operated" count).
export async function getSafetyRecord(db: Db, projectId: string, contractorId: string, date: string) {
  const rows = await db
    .select({
      accidents: sql<number>`count(*) filter (where ${dailyReports.accidentOccurred} is true)`.mapWith(Number),
      lastAccident: sql<string | null>`max(${dailyReports.reportDate}) filter (where ${dailyReports.accidentOccurred} is true)`,
      firstReport: sql<string | null>`min(${dailyReports.reportDate})`,
    })
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.contractorId, contractorId),
        sql`${dailyReports.reportDate} <= ${date}`,
      ),
    );
  return rows[0] ?? { accidents: 0, lastAccident: null, firstReport: null };
}

// Itemised OT of one report (evening).
export async function listOvertime(db: Db, reportId: string) {
  return db
    .select({
      id: dailyReportOvertime.id,
      buildingId: dailyReportOvertime.buildingId,
      buildingCode: buildings.code,
      buildingName: buildings.name,
      task: dailyReportOvertime.task,
      workers: dailyReportOvertime.workers,
      hours: dailyReportOvertime.hours,
    })
    .from(dailyReportOvertime)
    .innerJoin(buildings, eq(dailyReportOvertime.buildingId, buildings.id))
    .where(eq(dailyReportOvertime.reportId, reportId))
    .orderBy(asc(dailyReportOvertime.sortOrder));
}
