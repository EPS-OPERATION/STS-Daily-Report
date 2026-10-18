import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { CoordinationInput, CoordinationPoint } from "@sts/shared";
import type { QueryDb } from "@/db/client.js";
import { contractors, coordinationColors, coordinationDayLocks, coordinationDayNotes, coordinationItems, coordinationMaps, coordinationRoadSegments, dailyReportRoadUsage, dailyReports, projectContractors, users } from "@/db/schema/index.js";

export async function getMap(db: QueryDb, projectId: string, lock = false) {
  const query = db.select().from(coordinationMaps).where(eq(coordinationMaps.projectId, projectId)).limit(1);
  const rows = await (lock ? query.for("update") : query);
  return rows[0] ?? null;
}
export async function listCoordinationContractors(db: QueryDb, projectId: string) {
  return db.select({ id: contractors.id, code: contractors.code, name: contractors.name, color: coordinationColors.color, revision: coordinationColors.revision })
    .from(projectContractors).innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .leftJoin(coordinationColors, and(eq(coordinationColors.projectId, projectId), eq(coordinationColors.contractorId, contractors.id)))
    .where(eq(projectContractors.projectId, projectId)).orderBy(asc(contractors.code));
}
export async function insertColor(db: QueryDb, projectId: string, contractorId: string, color: string) {
  await db.insert(coordinationColors).values({ projectId, contractorId, color }).onConflictDoNothing();
}
export async function updateColor(db: QueryDb, projectId: string, contractorId: string, color: string, revision: number) {
  const rows = await db.update(coordinationColors).set({ color, revision: sql`${coordinationColors.revision} + 1`, updatedAt: sql`now()` })
    .where(and(eq(coordinationColors.projectId, projectId), eq(coordinationColors.contractorId, contractorId), eq(coordinationColors.revision, revision))).returning();
  return rows[0] ?? null;
}
export function listItems(db: QueryDb, projectId: string, workDate: string) {
  return db.select().from(coordinationItems).where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.workDate, workDate)))
    .orderBy(asc(coordinationItems.createdAt), asc(coordinationItems.id));
}
export async function getItem(db: QueryDb, projectId: string, id: string) {
  const rows = await db.select().from(coordinationItems).where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.id, id))).limit(1);
  return rows[0] ?? null;
}
export async function insertItem(db: QueryDb, projectId: string, mapId: string, input: CoordinationInput, userId: string) {
  const [row] = await db.insert(coordinationItems).values({ projectId, mapId, ...input, createdBy: userId, updatedBy: userId }).returning();
  return row!;
}
export async function updateItem(db: QueryDb, projectId: string, id: string, input: CoordinationInput, revision: number, userId: string) {
  const rows = await db.update(coordinationItems).set({ ...input, revision: sql`${coordinationItems.revision} + 1`, updatedBy: userId, updatedAt: sql`now()` })
    .where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.id, id), eq(coordinationItems.revision, revision))).returning();
  return rows[0] ?? null;
}
export async function deleteItem(db: QueryDb, projectId: string, id: string, revision: number) {
  const rows = await db.delete(coordinationItems).where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.id, id), eq(coordinationItems.revision, revision)))
    .returning({ id: coordinationItems.id });
  return rows.length === 1;
}
export async function getDayNote(db: QueryDb, projectId: string, workDate: string) {
  const rows = await db.select({ note: coordinationDayNotes.note, updatedAt: coordinationDayNotes.updatedAt, updatedByName: users.displayName, updatedByEmail: users.email })
    .from(coordinationDayNotes).leftJoin(users, eq(coordinationDayNotes.updatedBy, users.id))
    .where(and(eq(coordinationDayNotes.projectId, projectId), eq(coordinationDayNotes.workDate, workDate))).limit(1);
  return rows[0] ?? null;
}
export async function upsertDayNote(db: QueryDb, projectId: string, workDate: string, note: string, userId: string) {
  await db.insert(coordinationDayNotes).values({ projectId, workDate, note, updatedBy: userId })
    .onConflictDoUpdate({ target: [coordinationDayNotes.projectId, coordinationDayNotes.workDate], set: { note, updatedBy: userId, updatedAt: sql`now()` } });
}
export async function deleteDayNote(db: QueryDb, projectId: string, workDate: string) {
  await db.delete(coordinationDayNotes).where(and(eq(coordinationDayNotes.projectId, projectId), eq(coordinationDayNotes.workDate, workDate)));
}
export async function getDayLock(db: QueryDb, projectId: string, workDate: string) {
  const rows = await db.select({ lockedAt: coordinationDayLocks.lockedAt, lockedByName: users.displayName, lockedByEmail: users.email })
    .from(coordinationDayLocks).leftJoin(users, eq(coordinationDayLocks.lockedBy, users.id))
    .where(and(eq(coordinationDayLocks.projectId, projectId), eq(coordinationDayLocks.workDate, workDate))).limit(1);
  return rows[0] ?? null;
}
export async function insertDayLock(db: QueryDb, projectId: string, workDate: string, userId: string) {
  await db.insert(coordinationDayLocks).values({ projectId, workDate, lockedBy: userId }).onConflictDoNothing();
}
export async function deleteDayLock(db: QueryDb, projectId: string, workDate: string) {
  await db.delete(coordinationDayLocks).where(and(eq(coordinationDayLocks.projectId, projectId), eq(coordinationDayLocks.workDate, workDate)));
}

// ---- road register ----
export type RoadSegmentInput = { road: string; name: string; points: CoordinationPoint[]; closed: boolean };
const segmentColumns = { id: coordinationRoadSegments.id, road: coordinationRoadSegments.road, name: coordinationRoadSegments.name, points: coordinationRoadSegments.points, closed: coordinationRoadSegments.closed };
export async function listRoadSegments(db: QueryDb, projectId: string) {
  return db.select(segmentColumns).from(coordinationRoadSegments).where(eq(coordinationRoadSegments.projectId, projectId)).orderBy(asc(coordinationRoadSegments.road), asc(coordinationRoadSegments.name));
}
// Another piece with this name (case-insensitive), other than `exceptId`.
export async function findRoadSegmentByName(db: QueryDb, projectId: string, name: string, exceptId?: string) {
  const [row] = await db
    .select(segmentColumns)
    .from(coordinationRoadSegments)
    .where(and(
      eq(coordinationRoadSegments.projectId, projectId),
      sql`lower(${coordinationRoadSegments.name}) = lower(${name})`,
      exceptId ? ne(coordinationRoadSegments.id, exceptId) : undefined,
    ))
    .limit(1);
  return row ?? null;
}
export async function getRoadSegment(db: QueryDb, projectId: string, id: string) {
  const [row] = await db.select(segmentColumns).from(coordinationRoadSegments).where(and(eq(coordinationRoadSegments.projectId, projectId), eq(coordinationRoadSegments.id, id))).limit(1);
  return row ?? null;
}
export async function insertRoadSegment(db: QueryDb, projectId: string, input: RoadSegmentInput, userId: string) {
  const [row] = await db.insert(coordinationRoadSegments).values({ projectId, ...input, updatedBy: userId }).returning(segmentColumns);
  return row!;
}
export async function updateRoadSegment(db: QueryDb, projectId: string, id: string, input: RoadSegmentInput, userId: string) {
  const [row] = await db.update(coordinationRoadSegments).set({ ...input, updatedBy: userId, updatedAt: new Date() })
    .where(and(eq(coordinationRoadSegments.projectId, projectId), eq(coordinationRoadSegments.id, id))).returning(segmentColumns);
  return row ?? null;
}
export async function deleteRoadSegment(db: QueryDb, projectId: string, id: string) {
  await db.delete(coordinationRoadSegments).where(and(eq(coordinationRoadSegments.projectId, projectId), eq(coordinationRoadSegments.id, id)));
}

// Road requests made for this day (Daily Request of the day before). Times are what EPS settled.
export async function listRoadRequests(db: QueryDb, projectId: string, date: string) {
  return db.select({
    id: dailyReportRoadUsage.id,
    contractorId: dailyReports.contractorId,
    roadLocation: dailyReportRoadUsage.roadLocation,
    startTime: sql<string>`coalesce(${dailyReportRoadUsage.adjustedStartTime}, ${dailyReportRoadUsage.startTime})`,
    endTime: sql<string>`coalesce(${dailyReportRoadUsage.adjustedEndTime}, ${dailyReportRoadUsage.endTime})`,
    purpose: dailyReportRoadUsage.purpose,
    segmentIds: dailyReportRoadUsage.segmentIds,
    route: dailyReportRoadUsage.route,
  }).from(dailyReportRoadUsage)
    .innerJoin(dailyReports, eq(dailyReportRoadUsage.reportId, dailyReports.id))
    .where(and(eq(dailyReports.projectId, projectId), eq(dailyReportRoadUsage.targetDate, date)))
    .orderBy(asc(dailyReportRoadUsage.startTime));
}
