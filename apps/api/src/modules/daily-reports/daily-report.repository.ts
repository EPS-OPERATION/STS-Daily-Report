import { and, asc, between, count, desc, eq, inArray, ne, or } from "drizzle-orm";
import {
  buildings,
  contractors,
  dailyReportAllocations,
  dailyReportEquipment,
  dailyReportEquipmentRequests,
  dailyReportMachinery,
  dailyReportPermits,
  dailyReportPhotos,
  dailyReportPositions,
  dailyReportRoadUsage,
  dailyReports,
  inspectionRequests,
} from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";
import type { BookingRow, EveningInput, MorningInput, RoadRow } from "./daily-report.type.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// A day-ahead request counts once its report has been sent (evening = normal path;
// morning = rows created before requests moved to the evening form).
const reportSent = or(eq(dailyReports.eveningStatus, "submitted"), eq(dailyReports.morningStatus, "submitted"));

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getReportById(db: Db, id: string) {
  const rows = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getReportByKey(db: Db, projectId: string, contractorId: string, reportDate: string) {
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
      headcount: dailyReportAllocations.headcount,
      workDescription: dailyReportAllocations.workDescription,
      planPercent: dailyReportAllocations.planPercent,
      actualPercent: dailyReportAllocations.actualPercent,
      countermeasure: dailyReportAllocations.countermeasure,
    })
    .from(dailyReportAllocations)
    .innerJoin(buildings, eq(dailyReportAllocations.buildingId, buildings.id))
    .where(eq(dailyReportAllocations.reportId, reportId))
    .orderBy(asc(dailyReportAllocations.sortOrder));
}

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

const roadColumns = {
  id: dailyReportRoadUsage.id,
  targetDate: dailyReportRoadUsage.targetDate,
  buildingId: dailyReportRoadUsage.buildingId,
  buildingCode: buildings.code,
  buildingName: buildings.name,
  roadLocation: dailyReportRoadUsage.roadLocation,
  startTime: dailyReportRoadUsage.startTime,
  endTime: dailyReportRoadUsage.endTime,
  purpose: dailyReportRoadUsage.purpose,
  contractorId: dailyReports.contractorId,
  contractorCode: contractors.code,
};

function roadQuery(db: Db) {
  return db
    .select(roadColumns)
    .from(dailyReportRoadUsage)
    .innerJoin(dailyReports, eq(dailyReportRoadUsage.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportRoadUsage.buildingId, buildings.id));
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
      reviewStatus: dailyReports.reviewStatus,
      reviewNote: dailyReports.reviewNote,
      reviewedAt: dailyReports.reviewedAt,
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

export async function listPositions(db: Db, reportId: string) {
  return db
    .select({ position: dailyReportPositions.position, headcount: dailyReportPositions.headcount })
    .from(dailyReportPositions)
    .where(eq(dailyReportPositions.reportId, reportId));
}

export async function listEquipment(db: Db, reportId: string) {
  return db
    .select({ equipmentType: dailyReportEquipment.equipmentType, qty: dailyReportEquipment.qty })
    .from(dailyReportEquipment)
    .where(eq(dailyReportEquipment.reportId, reportId));
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

// Upsert header + replace morning children atomically. Evening fields are untouched.
export async function saveMorning(db: Db, projectId: string, input: MorningInput, userId: string) {
  return db.transaction(async (tx: Tx) => {
    const now = new Date();
    const header = {
      startTime: input.startTime,
      endTime: input.endTime,
      workHours: input.workHours,
      disciplines: input.disciplines,
      weather: input.weather,
      temperatureC: input.temperatureC ?? null,
      humidityPct: input.humidityPct ?? null,
      thaiMale: input.thaiMale,
      thaiFemale: input.thaiFemale,
      foreignMale: input.foreignMale,
      foreignFemale: input.foreignFemale,
      morningStatus: "submitted",
      morningSubmittedAt: now,
      morningSubmittedBy: userId,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(dailyReports)
      .values({ projectId, contractorId: input.contractorId, reportDate: input.date, ...header })
      .onConflictDoUpdate({
        target: [dailyReports.projectId, dailyReports.contractorId, dailyReports.reportDate],
        set: header,
      })
      .returning({ id: dailyReports.id });
    const reportId = row!.id;

    await tx.delete(dailyReportAllocations).where(eq(dailyReportAllocations.reportId, reportId));
    await tx.delete(dailyReportPositions).where(eq(dailyReportPositions.reportId, reportId));
    await tx.delete(dailyReportEquipment).where(eq(dailyReportEquipment.reportId, reportId));

    await tx
      .insert(dailyReportPositions)
      .values(input.positions.map((p) => ({ reportId, position: p.position, headcount: p.headcount })));
    if (input.equipment.length > 0) {
      await tx
        .insert(dailyReportEquipment)
        .values(input.equipment.map((e) => ({ reportId, equipmentType: e.equipmentType, qty: e.qty })));
    }
    await tx.insert(dailyReportAllocations).values(
      input.allocations.map((a, i) => ({
        reportId,
        buildingId: a.buildingId,
        headcount: a.headcount,
        workDescription: a.workDescription.trim(),
        planPercent: a.planPercent,
        sortOrder: i,
      })),
    );
    return reportId;
  });
}

// Evening check-out works with or without a morning report: upsert the header,
// record actuals for any morning allocations, and replace tomorrow's requests.
export async function saveEvening(db: Db, projectId: string, input: EveningInput, userId: string) {
  return db.transaction(async (tx: Tx) => {
    const now = new Date();
    const tomorrow = addDays(input.date, 1);
    const header = {
      otHours: input.otHours,
      accidentOccurred: input.accidentOccurred,
      accidentNote: input.accidentOccurred ? input.accidentNote?.trim() || null : null,
      accidentCategory: input.accidentOccurred ? (input.accidentCategory ?? null) : null,
      signatureName: input.signatureName.trim(),
      signatureData: input.signatureData,
      signedAt: now,
      eveningStatus: "submitted",
      eveningSubmittedAt: now,
      eveningSubmittedBy: userId,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(dailyReports)
      .values({ projectId, contractorId: input.contractorId, reportDate: input.date, ...header })
      .onConflictDoUpdate({
        target: [dailyReports.projectId, dailyReports.contractorId, dailyReports.reportDate],
        set: header,
      })
      .returning({ id: dailyReports.id });
    const reportId = row!.id;

    for (const p of input.progress) {
      await tx
        .update(dailyReportAllocations)
        .set({
          actualPercent: p.actualPercent,
          countermeasure: p.countermeasure?.trim() || null,
          updatedAt: now,
        })
        .where(and(eq(dailyReportAllocations.id, p.allocationId), eq(dailyReportAllocations.reportId, reportId)));
    }

    await tx.delete(dailyReportMachinery).where(eq(dailyReportMachinery.reportId, reportId));
    await tx.delete(dailyReportEquipmentRequests).where(eq(dailyReportEquipmentRequests.reportId, reportId));
    await tx.delete(dailyReportPermits).where(eq(dailyReportPermits.reportId, reportId));
    await tx.delete(dailyReportRoadUsage).where(eq(dailyReportRoadUsage.reportId, reportId));
    if (input.machinery.length > 0) {
      await tx.insert(dailyReportMachinery).values(
        input.machinery.map((m) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: m.buildingId,
          machineType: m.machineType,
          unitTag: m.unitTag?.trim().toUpperCase() || null,
          startTime: m.startTime ?? null,
          endTime: m.endTime ?? null,
          purpose: m.purpose?.trim() || null,
        })),
      );
    }
    if (input.equipmentRequests.length > 0) {
      await tx.insert(dailyReportEquipmentRequests).values(
        input.equipmentRequests.map((e) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: e.buildingId,
          equipmentType: e.equipmentType,
          qty: e.qty,
          purpose: e.purpose?.trim() || null,
        })),
      );
    }
    if (input.permits.length > 0) {
      await tx.insert(dailyReportPermits).values(
        input.permits.map((p) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: p.buildingId,
          permitType: p.permitType,
          otherLabel: p.permitType === "other" ? p.otherLabel?.trim() || null : null,
          workers: p.workers,
        })),
      );
    }
    if (input.roadUsage.length > 0) {
      await tx.insert(dailyReportRoadUsage).values(
        input.roadUsage.map((r) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: r.buildingId,
          roadLocation: r.roadLocation.trim(),
          startTime: r.startTime,
          endTime: r.endTime,
          purpose: r.purpose.trim(),
        })),
      );
    }
    // Sending the evening report sends that day's saved QAQC requests (for tomorrow) to EPS.
    await tx
      .update(inspectionRequests)
      .set({ status: "requested", statusChangedAt: now, statusChangedBy: userId, updatedAt: now })
      .where(
        and(
          eq(inspectionRequests.projectId, projectId),
          eq(inspectionRequests.contractorId, input.contractorId),
          eq(inspectionRequests.reportDate, input.date),
          eq(inspectionRequests.status, "draft"),
        ),
      );
    return reportId;
  });
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

export async function listAllocationsInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      reportDate: dailyReports.reportDate,
      buildingId: dailyReportAllocations.buildingId,
      contractorId: contractors.id,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      headcount: dailyReportAllocations.headcount,
    })
    .from(dailyReportAllocations)
    .innerJoin(dailyReports, eq(dailyReportAllocations.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.morningStatus, "submitted"),
        between(dailyReports.reportDate, from, to),
      ),
    );
}

// Per-report headcount + hours for NMH. Headcount = nationality split total.
export async function listReportHoursInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      reportDate: dailyReports.reportDate,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      thaiMale: dailyReports.thaiMale,
      thaiFemale: dailyReports.thaiFemale,
      foreignMale: dailyReports.foreignMale,
      foreignFemale: dailyReports.foreignFemale,
      workHours: dailyReports.workHours,
      otHours: dailyReports.otHours,
    })
    .from(dailyReports)
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.morningStatus, "submitted"),
        between(dailyReports.reportDate, from, to),
      ),
    );
}

export async function countRequestsByStatusInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({ status: inspectionRequests.status, n: count() })
    .from(inspectionRequests)
    .where(and(eq(inspectionRequests.projectId, projectId), between(inspectionRequests.inspectionDate, from, to)))
    .groupBy(inspectionRequests.status);
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
    .where(and(eq(dailyReports.projectId, projectId), reportSent, between(dailyReportPermits.targetDate, from, to)));
}

// Headcount by position per contractor per day (morning shift = who came to work).
export async function listPositionsInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      reportDate: dailyReports.reportDate,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      position: dailyReportPositions.position,
      headcount: dailyReportPositions.headcount,
    })
    .from(dailyReportPositions)
    .innerJoin(dailyReports, eq(dailyReportPositions.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.morningStatus, "submitted"),
        between(dailyReports.reportDate, from, to),
      ),
    );
}

// Morning allocations for one day with the work description (site plan drawer).
export async function listAllocationDetailsInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      reportDate: dailyReports.reportDate,
      buildingId: dailyReportAllocations.buildingId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      headcount: dailyReportAllocations.headcount,
      workDescription: dailyReportAllocations.workDescription,
      planPercent: dailyReportAllocations.planPercent,
      actualPercent: dailyReportAllocations.actualPercent,
    })
    .from(dailyReportAllocations)
    .innerJoin(dailyReports, eq(dailyReportAllocations.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.morningStatus, "submitted"),
        between(dailyReports.reportDate, from, to),
      ),
    )
    .orderBy(asc(dailyReports.reportDate), asc(contractors.code));
}
