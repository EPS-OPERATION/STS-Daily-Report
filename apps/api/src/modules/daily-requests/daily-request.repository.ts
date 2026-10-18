import { and, asc, between, eq, isNotNull, ne, or, sql } from "drizzle-orm";
import type { Db, QueryDb } from "@/db/client.js";
import { reportSent } from "@/db/report-filters.js";
import { buildings, contractors, dailyReportEquipmentRequests, dailyReportForecasts, dailyReportMachinery, dailyReportPermits, dailyReportRoadUsage, dailyReports, users } from "@/db/schema/index.js";
import type { AdjustedRoadRequest } from "./daily-request.road.js";
import type { BookingRow, RoadRow } from "./daily-request.type.js";

// A permit EPS added counts even when the contractor has not sent that day's report yet.
const permitShown = or(reportSent, eq(dailyReportPermits.epsAdded, true));

export async function listMachinery(db: Db, reportId: string) {
  return db
    .select({
      id: dailyReportMachinery.id,
      targetDate: dailyReportMachinery.targetDate,
      buildingId: dailyReportMachinery.buildingId,
      buildingCode: buildings.code,
      machineType: dailyReportMachinery.machineType,
      unitTag: dailyReportMachinery.unitTag,
      startTime: dailyReportMachinery.startTime,
      endTime: dailyReportMachinery.endTime,
      purpose: dailyReportMachinery.purpose,
    })
    .from(dailyReportMachinery)
    .innerJoin(buildings, eq(dailyReportMachinery.buildingId, buildings.id))
    .where(eq(dailyReportMachinery.reportId, reportId))
    .orderBy(asc(dailyReportMachinery.startTime));
}

export async function listPermits(db: Db, reportId: string) {
  return db
    .select({
      id: dailyReportPermits.id,
      targetDate: dailyReportPermits.targetDate,
      buildingId: dailyReportPermits.buildingId,
      buildingCode: buildings.code,
      permitType: dailyReportPermits.permitType,
      otherLabel: dailyReportPermits.otherLabel,
      workers: dailyReportPermits.workers,
      highRisk: dailyReportPermits.highRisk,
      taskName: dailyReportPermits.taskName,
      supervisorName: dailyReportPermits.supervisorName,
    })
    .from(dailyReportPermits)
    .innerJoin(buildings, eq(dailyReportPermits.buildingId, buildings.id))
    .where(eq(dailyReportPermits.reportId, reportId))
    .orderBy(asc(dailyReportPermits.createdAt));
}

const equipmentRequestColumns = {
  id: dailyReportEquipmentRequests.id,
  targetDate: dailyReportEquipmentRequests.targetDate,
  buildingId: dailyReportEquipmentRequests.buildingId,
  buildingCode: buildings.code,
  buildingName: buildings.name,
  equipmentType: dailyReportEquipmentRequests.equipmentType,
  qty: dailyReportEquipmentRequests.qty,
  purpose: dailyReportEquipmentRequests.purpose,
  contractorId: dailyReports.contractorId,
  contractorCode: contractors.code,
  contractorName: contractors.name,
};

function equipmentRequestQuery(db: Db) {
  return db
    .select(equipmentRequestColumns)
    .from(dailyReportEquipmentRequests)
    .innerJoin(dailyReports, eq(dailyReportEquipmentRequests.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportEquipmentRequests.buildingId, buildings.id));
}

export async function listEquipmentRequests(db: Db, reportId: string) {
  return equipmentRequestQuery(db)
    .where(eq(dailyReportEquipmentRequests.reportId, reportId))
    .orderBy(asc(dailyReportEquipmentRequests.createdAt));
}

export async function listEquipmentRequestsInRange(db: Db, projectId: string, from: string, to: string) {
  return equipmentRequestQuery(db)
    .where(and(eq(dailyReports.projectId, projectId), reportSent, between(dailyReportEquipmentRequests.targetDate, from, to)))
    .orderBy(asc(dailyReportEquipmentRequests.targetDate), asc(dailyReportEquipmentRequests.equipmentType));
}

// startTime/endTime = what EPS settled (the contractor's request until EPS changes it). Conflicts, lists
// and print read these; requested* keeps the contractor's own times for their form.
const roadColumns = {
  id: dailyReportRoadUsage.id,
  targetDate: dailyReportRoadUsage.targetDate,
  buildingId: dailyReportRoadUsage.buildingId,
  buildingCode: buildings.code,
  buildingName: buildings.name,
  roadLocation: dailyReportRoadUsage.roadLocation,
  startTime: sql<string>`coalesce(${dailyReportRoadUsage.adjustedStartTime}, ${dailyReportRoadUsage.startTime})`,
  endTime: sql<string>`coalesce(${dailyReportRoadUsage.adjustedEndTime}, ${dailyReportRoadUsage.endTime})`,
  requestedStartTime: dailyReportRoadUsage.startTime,
  requestedEndTime: dailyReportRoadUsage.endTime,
  adjusted: sql<boolean>`${dailyReportRoadUsage.adjustedAt} is not null`,
  adjustedAt: dailyReportRoadUsage.adjustedAt,
  adjustedByName: sql<string | null>`coalesce(${users.displayName}, ${users.email})`,
  purpose: dailyReportRoadUsage.purpose,
  segmentIds: dailyReportRoadUsage.segmentIds,
  route: dailyReportRoadUsage.route,
  contractorId: dailyReports.contractorId,
  contractorCode: contractors.code,
  contractorName: contractors.name,
};

function roadQuery(db: Db) {
  return db
    .select(roadColumns)
    .from(dailyReportRoadUsage)
    .innerJoin(dailyReports, eq(dailyReportRoadUsage.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .leftJoin(buildings, eq(dailyReportRoadUsage.buildingId, buildings.id))
    .leftJoin(users, eq(dailyReportRoadUsage.adjustedBy, users.id));
}

export async function listRoadUsage(db: Db, reportId: string): Promise<RoadRow[]> {
  return roadQuery(db).where(eq(dailyReportRoadUsage.reportId, reportId)).orderBy(asc(dailyReportRoadUsage.startTime));
}

export async function listRoadUsageInRange(db: Db, projectId: string, from: string, to: string) {
  return roadQuery(db)
    .where(and(eq(dailyReports.projectId, projectId), reportSent, between(dailyReportRoadUsage.targetDate, from, to)))
    .orderBy(asc(dailyReportRoadUsage.targetDate), asc(dailyReportRoadUsage.roadLocation), asc(dailyReportRoadUsage.startTime));
}

export async function listRoadUsageForTargetExcluding(db: Db, projectId: string, targetDate: string, reportId: string) {
  return roadQuery(db).where(
    and(
      eq(dailyReports.projectId, projectId),
      reportSent,
      eq(dailyReportRoadUsage.targetDate, targetDate),
      ne(dailyReports.id, reportId),
    ),
  );
}

// What a contractor asked for (the evening before) to happen on `targetDate`.
export async function listPlannedForDate(db: Db, projectId: string, contractorId: string, targetDate: string) {
  const scope = and(eq(dailyReports.projectId, projectId), eq(dailyReports.contractorId, contractorId), reportSent);
  const [machinery, permits, roads, equipment] = await Promise.all([
    db
      .select({
        id: dailyReportMachinery.id,
        buildingCode: buildings.code,
        buildingName: buildings.name,
        machineType: dailyReportMachinery.machineType,
        unitTag: dailyReportMachinery.unitTag,
        startTime: dailyReportMachinery.startTime,
        endTime: dailyReportMachinery.endTime,
        purpose: dailyReportMachinery.purpose,
      })
      .from(dailyReportMachinery)
      .innerJoin(dailyReports, eq(dailyReportMachinery.reportId, dailyReports.id))
      .innerJoin(buildings, eq(dailyReportMachinery.buildingId, buildings.id))
      .where(and(scope, eq(dailyReportMachinery.targetDate, targetDate)))
      .orderBy(asc(dailyReportMachinery.startTime)),
    db
      .select({
        id: dailyReportPermits.id,
        buildingCode: buildings.code,
        buildingName: buildings.name,
        permitType: dailyReportPermits.permitType,
        otherLabel: dailyReportPermits.otherLabel,
        workers: dailyReportPermits.workers,
      })
      .from(dailyReportPermits)
      .innerJoin(dailyReports, eq(dailyReportPermits.reportId, dailyReports.id))
      .innerJoin(buildings, eq(dailyReportPermits.buildingId, buildings.id))
      .where(and(scope, eq(dailyReportPermits.targetDate, targetDate))),
    roadQuery(db)
      .where(and(scope, eq(dailyReportRoadUsage.targetDate, targetDate)))
      .orderBy(asc(dailyReportRoadUsage.startTime)),
    equipmentRequestQuery(db).where(and(scope, eq(dailyReportEquipmentRequests.targetDate, targetDate))),
  ]);
  return { machinery, permits, roads, equipment };
}

const bookingColumns = {
  id: dailyReportMachinery.id,
  targetDate: dailyReportMachinery.targetDate,
  machineType: dailyReportMachinery.machineType,
  unitTag: dailyReportMachinery.unitTag,
  startTime: dailyReportMachinery.startTime,
  endTime: dailyReportMachinery.endTime,
  purpose: dailyReportMachinery.purpose,
  contractorId: dailyReports.contractorId,
  contractorCode: contractors.code,
  contractorName: contractors.name,
  buildingId: dailyReportMachinery.buildingId,
  buildingCode: buildings.code,
  buildingName: buildings.name,
};

// Bookings on target dates in range, from sent reports only.
export async function listBookingsInRange(db: Db, projectId: string, from: string, to: string): Promise<BookingRow[]> {
  return db
    .select(bookingColumns)
    .from(dailyReportMachinery)
    .innerJoin(dailyReports, eq(dailyReportMachinery.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportMachinery.buildingId, buildings.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        reportSent,
        between(dailyReportMachinery.targetDate, from, to),
      ),
    )
    .orderBy(asc(dailyReportMachinery.targetDate), asc(dailyReportMachinery.machineType), asc(dailyReportMachinery.startTime));
}

export async function listBookingsForTargetExcluding(db: Db, projectId: string, targetDate: string, reportId: string) {
  return db
    .select(bookingColumns)
    .from(dailyReportMachinery)
    .innerJoin(dailyReports, eq(dailyReportMachinery.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportMachinery.buildingId, buildings.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        reportSent,
        eq(dailyReportMachinery.targetDate, targetDate),
        ne(dailyReports.id, reportId),
      ),
    );
}

export async function listBookingsForReport(db: Db, reportId: string): Promise<BookingRow[]> {
  return db
    .select(bookingColumns)
    .from(dailyReportMachinery)
    .innerJoin(dailyReports, eq(dailyReportMachinery.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportMachinery.buildingId, buildings.id))
    .where(eq(dailyReports.id, reportId));
}

export async function listPermitsInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      targetDate: dailyReportPermits.targetDate,
      buildingId: dailyReportPermits.buildingId,
      permitType: dailyReportPermits.permitType,
      workers: dailyReportPermits.workers,
    })
    .from(dailyReportPermits)
    .innerJoin(dailyReports, eq(dailyReportPermits.reportId, dailyReports.id))
    .where(and(eq(dailyReports.projectId, projectId), permitShown, between(dailyReportPermits.targetDate, from, to)));
}

// Tomorrow Forecast Activities raised by one report.
export async function listForecasts(db: Db, reportId: string) {
  return db
    .select({
      id: dailyReportForecasts.id,
      targetDate: dailyReportForecasts.targetDate,
      buildingId: dailyReportForecasts.buildingId,
      buildingCode: buildings.code,
      buildingName: buildings.name,
      description: dailyReportForecasts.description,
    })
    .from(dailyReportForecasts)
    .innerJoin(buildings, eq(dailyReportForecasts.buildingId, buildings.id))
    .where(eq(dailyReportForecasts.reportId, reportId))
    .orderBy(asc(dailyReportForecasts.sortOrder));
}

// Forecast activities for target dates in range, from sent reports (Daily Request history).
export async function listForecastsInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      id: dailyReportForecasts.id,
      targetDate: dailyReportForecasts.targetDate,
      buildingId: dailyReportForecasts.buildingId,
      buildingCode: buildings.code,
      buildingName: buildings.name,
      description: dailyReportForecasts.description,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
    })
    .from(dailyReportForecasts)
    .innerJoin(dailyReports, eq(dailyReportForecasts.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportForecasts.buildingId, buildings.id))
    .where(and(eq(dailyReports.projectId, projectId), reportSent, between(dailyReportForecasts.targetDate, from, to)))
    .orderBy(asc(dailyReportForecasts.targetDate), asc(contractors.code), asc(dailyReportForecasts.sortOrder));
}

// Permits for target dates in range with who asked for them (Daily Request history).
export async function listPermitDetailsInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      id: dailyReportPermits.id,
      targetDate: dailyReportPermits.targetDate,
      buildingId: dailyReportPermits.buildingId,
      buildingCode: buildings.code,
      buildingName: buildings.name,
      permitType: dailyReportPermits.permitType,
      otherLabel: dailyReportPermits.otherLabel,
      workers: dailyReportPermits.workers,
      highRisk: dailyReportPermits.highRisk,
      taskName: dailyReportPermits.taskName,
      supervisorName: dailyReportPermits.supervisorName,
      epsAdded: dailyReportPermits.epsAdded,
      epsEdited: isNotNull(dailyReportPermits.epsEditedAt),
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
    })
    .from(dailyReportPermits)
    .innerJoin(dailyReports, eq(dailyReportPermits.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportPermits.buildingId, buildings.id))
    .where(and(eq(dailyReports.projectId, projectId), permitShown, between(dailyReportPermits.targetDate, from, to)))
    .orderBy(asc(dailyReportPermits.targetDate), asc(contractors.code));
}

export async function getPermitForProject(db: Db, projectId: string, id: string) {
  const rows = await db
    .select({
      id: dailyReportPermits.id,
      reportId: dailyReportPermits.reportId,
      targetDate: dailyReportPermits.targetDate,
      buildingId: dailyReportPermits.buildingId,
      buildingCode: buildings.code,
      buildingName: buildings.name,
      permitType: dailyReportPermits.permitType,
      otherLabel: dailyReportPermits.otherLabel,
      workers: dailyReportPermits.workers,
      highRisk: dailyReportPermits.highRisk,
      taskName: dailyReportPermits.taskName,
      supervisorName: dailyReportPermits.supervisorName,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      projectId: dailyReports.projectId,
    })
    .from(dailyReportPermits)
    .innerJoin(dailyReports, eq(dailyReportPermits.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportPermits.buildingId, buildings.id))
    .where(and(eq(dailyReportPermits.id, id), eq(dailyReports.projectId, projectId)))
    .limit(1);
  return rows[0] ?? null;
}

// EPS edit: stamped so the contractor re-sending the morning report keeps it.
export async function updatePermitRow(
  db: Db,
  id: string,
  data: {
    targetDate?: string;
    buildingId?: string;
    permitType?: string;
    otherLabel?: string | null;
    workers?: number;
    highRisk?: boolean;
    taskName?: string | null;
    supervisorName?: string | null;
  },
) {
  await db
    .update(dailyReportPermits)
    .set({ ...data, epsEditedAt: new Date() })
    .where(eq(dailyReportPermits.id, id));
}

// The report row a permit belongs to: an empty draft is created for (project, contractor, date) when none exists
// yet; an existing row is never touched. Kept here (not daily-reports) so modules depend one way only.
export async function ensureReportRow(db: Db, projectId: string, contractorId: string, reportDate: string) {
  await db.insert(dailyReports).values({ projectId, contractorId, reportDate }).onConflictDoNothing();
  const [row] = await db
    .select({ id: dailyReports.id })
    .from(dailyReports)
    .where(and(eq(dailyReports.projectId, projectId), eq(dailyReports.contractorId, contractorId), eq(dailyReports.reportDate, reportDate)))
    .limit(1);
  return row!;
}

// EPS adds a permit to a contractor's report (the report row may still be a draft).
export async function insertEpsPermitRow(
  db: Db,
  data: {
    reportId: string;
    targetDate: string;
    buildingId: string;
    permitType: string;
    otherLabel: string | null;
    workers: number;
    highRisk: boolean;
    taskName: string | null;
    supervisorName: string | null;
  },
) {
  const [row] = await db
    .insert(dailyReportPermits)
    .values({ ...data, epsAdded: true, epsEditedAt: new Date() })
    .returning({ id: dailyReportPermits.id });
  return row!.id;
}

// EPS time change: only the adjusted window is written; the contractor's request stays in start/end.
export async function getRoadUsageForProject(db: Db, projectId: string, id: string) {
  const rows = await roadQuery(db).where(and(eq(dailyReportRoadUsage.id, id), eq(dailyReports.projectId, projectId))).limit(1);
  return rows[0] ?? null;
}

export async function setRoadAdjustment(db: Db, id: string, value: { startTime: string; endTime: string; byId: string; at: Date } | null) {
  await db
    .update(dailyReportRoadUsage)
    .set(
      value
        ? { adjustedStartTime: value.startTime, adjustedEndTime: value.endTime, adjustedBy: value.byId, adjustedAt: value.at }
        : { adjustedStartTime: null, adjustedEndTime: null, adjustedBy: null, adjustedAt: null },
    )
    .where(eq(dailyReportRoadUsage.id, id));
}

// EPS changes already on this report, read before a re-sent report replaces its road rows.
export async function listAdjustedRoads(db: QueryDb, reportId: string): Promise<AdjustedRoadRequest[]> {
  const rows = await db
    .select({
      buildingId: dailyReportRoadUsage.buildingId,
      roadLocation: dailyReportRoadUsage.roadLocation,
      startTime: dailyReportRoadUsage.startTime,
      endTime: dailyReportRoadUsage.endTime,
      adjustedStartTime: dailyReportRoadUsage.adjustedStartTime,
      adjustedEndTime: dailyReportRoadUsage.adjustedEndTime,
      adjustedBy: dailyReportRoadUsage.adjustedBy,
      adjustedAt: dailyReportRoadUsage.adjustedAt,
    })
    .from(dailyReportRoadUsage)
    .where(and(eq(dailyReportRoadUsage.reportId, reportId), isNotNull(dailyReportRoadUsage.adjustedAt)));
  return rows.flatMap((r) =>
    r.adjustedStartTime && r.adjustedEndTime && r.adjustedAt
      ? [{ ...r, adjustedStartTime: r.adjustedStartTime, adjustedEndTime: r.adjustedEndTime, adjustedAt: r.adjustedAt }]
      : [],
  );
}
