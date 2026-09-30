import { and, asc, between, count, eq, ne } from "drizzle-orm";
import {
  buildings,
  contractors,
  dailyReportAllocations,
  dailyReportEquipment,
  dailyReportMachinery,
  dailyReportPermits,
  dailyReportPhotos,
  dailyReportPositions,
  dailyReports,
  inspectionRequests,
} from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";
import type { BookingRow, EveningInput, MorningInput } from "./daily-report.type.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

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
      buildingId: dailyReportMachinery.buildingId,
      buildingCode: buildings.code,
      machineType: dailyReportMachinery.machineType,
      unitTag: dailyReportMachinery.unitTag,
      startTime: dailyReportMachinery.startTime,
      endTime: dailyReportMachinery.endTime,
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
    await tx.delete(dailyReportMachinery).where(eq(dailyReportMachinery.reportId, reportId));
    await tx.delete(dailyReportPermits).where(eq(dailyReportPermits.reportId, reportId));
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
    // Sending the morning shift sends that day's saved Daily Requests to QAQC.
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
    if (input.machinery.length > 0) {
      await tx.insert(dailyReportMachinery).values(
        input.machinery.map((m) => ({
          reportId,
          buildingId: m.buildingId,
          machineType: m.machineType,
          unitTag: m.unitTag?.trim().toUpperCase() || null,
          startTime: m.startTime,
          endTime: m.endTime,
        })),
      );
    }
    if (input.permits.length > 0) {
      await tx.insert(dailyReportPermits).values(
        input.permits.map((p) => ({
          reportId,
          buildingId: p.buildingId,
          permitType: p.permitType,
          otherLabel: p.permitType === "other" ? p.otherLabel?.trim() || null : null,
          workers: p.workers,
        })),
      );
    }
    return reportId;
  });
}

export async function saveEvening(db: Db, reportId: string, input: EveningInput, userId: string) {
  await db.transaction(async (tx: Tx) => {
    const now = new Date();
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
    await tx
      .update(dailyReports)
      .set({
        otHours: input.otHours,
        accidentOccurred: input.accidentOccurred,
        accidentNote: input.accidentOccurred ? input.accidentNote?.trim() || null : null,
        signatureName: input.signatureName.trim(),
        signatureData: input.signatureData,
        signedAt: now,
        eveningStatus: "submitted",
        eveningSubmittedAt: now,
        eveningSubmittedBy: userId,
        updatedAt: now,
      })
      .where(eq(dailyReports.id, reportId));
  });
}

const bookingColumns = {
  id: dailyReportMachinery.id,
  reportDate: dailyReports.reportDate,
  machineType: dailyReportMachinery.machineType,
  unitTag: dailyReportMachinery.unitTag,
  startTime: dailyReportMachinery.startTime,
  endTime: dailyReportMachinery.endTime,
  contractorId: dailyReports.contractorId,
  contractorCode: contractors.code,
  buildingId: dailyReportMachinery.buildingId,
  buildingCode: buildings.code,
  buildingName: buildings.name,
};

// Only submitted morning shifts count as real bookings / allocations.
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
        eq(dailyReports.morningStatus, "submitted"),
        between(dailyReports.reportDate, from, to),
      ),
    )
    .orderBy(asc(dailyReports.reportDate), asc(dailyReportMachinery.machineType), asc(dailyReportMachinery.startTime));
}

export async function listBookingsForDateExcluding(db: Db, projectId: string, reportDate: string, reportId: string) {
  return db
    .select(bookingColumns)
    .from(dailyReportMachinery)
    .innerJoin(dailyReports, eq(dailyReportMachinery.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .innerJoin(buildings, eq(dailyReportMachinery.buildingId, buildings.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.morningStatus, "submitted"),
        eq(dailyReports.reportDate, reportDate),
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
      thaiMale: dailyReports.thaiMale,
      thaiFemale: dailyReports.thaiFemale,
      foreignMale: dailyReports.foreignMale,
      foreignFemale: dailyReports.foreignFemale,
      workHours: dailyReports.workHours,
      otHours: dailyReports.otHours,
    })
    .from(dailyReports)
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
      reportDate: dailyReports.reportDate,
      buildingId: dailyReportPermits.buildingId,
      permitType: dailyReportPermits.permitType,
      workers: dailyReportPermits.workers,
    })
    .from(dailyReportPermits)
    .innerJoin(dailyReports, eq(dailyReportPermits.reportId, dailyReports.id))
    .where(
      and(
        eq(dailyReports.projectId, projectId),
        eq(dailyReports.morningStatus, "submitted"),
        between(dailyReports.reportDate, from, to),
      ),
    );
}
