import { and, asc, between, count, desc, eq, ilike, sql } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { reportSent } from "@/db/report-filters.js";
import { contractors, dailyReportAllocations, dailyReportMaterials, dailyReportPositions, dailyReports, inspectionRequests } from "@/db/schema/index.js";

export interface MaterialsLogFilter {
  from?: string;
  to?: string;
  search?: string;
  contractorId?: string;
  limit: number;
  offset: number;
}

// EPS materials dashboard: what each contractor reported on site per day.
function materialsLogWhere(projectId: string, f: Omit<MaterialsLogFilter, "limit" | "offset">) {
  return and(
    eq(dailyReports.projectId, projectId),
    f.from && f.to
      ? between(dailyReports.reportDate, f.from, f.to)
      : f.from
        ? eq(dailyReports.reportDate, f.from)
        : undefined,
    f.contractorId ? eq(dailyReports.contractorId, f.contractorId) : undefined,
    f.search ? ilike(dailyReportMaterials.materialName, `%${f.search}%`) : undefined,
  );
}

export async function listMaterialsLog(db: Db, projectId: string, f: MaterialsLogFilter) {
  return db
    .select({
      id: dailyReportMaterials.id,
      reportDate: dailyReports.reportDate,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      materialName: dailyReportMaterials.materialName,
      qty: dailyReportMaterials.qty,
      unit: dailyReportMaterials.unit,
    })
    .from(dailyReportMaterials)
    .innerJoin(dailyReports, eq(dailyReportMaterials.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(materialsLogWhere(projectId, f))
    .orderBy(desc(dailyReports.reportDate), contractors.code, asc(dailyReportMaterials.materialName))
    .limit(f.limit)
    .offset(f.offset);
}

export async function countMaterialsLog(
  db: Db,
  projectId: string,
  f: Omit<MaterialsLogFilter, "limit" | "offset">,
) {
  const rows = await db
    .select({ n: count() })
    .from(dailyReportMaterials)
    .innerJoin(dailyReports, eq(dailyReportMaterials.reportId, dailyReports.id))
    .where(materialsLogWhere(projectId, f));
  return rows[0]?.n ?? 0;
}

export async function summarizeMaterials(
  db: Db,
  projectId: string,
  f: Omit<MaterialsLogFilter, "limit" | "offset">,
) {
  const rows = await db
    .select({
      materialName: dailyReportMaterials.materialName,
      unit: dailyReportMaterials.unit,
      entries: count(),
      totalQty: sql<string>`sum(${dailyReportMaterials.qty})`,
    })
    .from(dailyReportMaterials)
    .innerJoin(dailyReports, eq(dailyReportMaterials.reportId, dailyReports.id))
    .where(materialsLogWhere(projectId, f))
    .groupBy(dailyReportMaterials.materialName, dailyReportMaterials.unit)
    .orderBy(desc(count()));
  return rows.map((r) => ({ materialName: r.materialName, unit: r.unit, entries: r.entries, totalQty: Number(r.totalQty) }));
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
      dayShare: dailyReportAllocations.dayShare,
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
      eveningThaiMale: dailyReports.eveningThaiMale,
      eveningThaiFemale: dailyReports.eveningThaiFemale,
      eveningForeignMale: dailyReports.eveningForeignMale,
      eveningForeignFemale: dailyReports.eveningForeignFemale,
      morningStatus: dailyReports.morningStatus,
      eveningStatus: dailyReports.eveningStatus,
      workHours: dailyReports.workHours,
      otHours: dailyReports.otHours,
      otManHours: dailyReports.otManHours,
    })
    .from(dailyReports)
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    // Either half counts: an afternoon-only report still is a day worked.
    .where(and(eq(dailyReports.projectId, projectId), reportSent, between(dailyReports.reportDate, from, to)));
}

export async function countRequestsByStatusInRange(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({ status: inspectionRequests.status, n: count() })
    .from(inspectionRequests)
    .where(and(eq(inspectionRequests.projectId, projectId), between(inspectionRequests.inspectionDate, from, to)))
    .groupBy(inspectionRequests.status);
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
        eq(dailyReportPositions.shift, "morning"),
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
      dayShare: dailyReportAllocations.dayShare,
      startTime: dailyReportAllocations.startTime,
      endTime: dailyReportAllocations.endTime,
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
