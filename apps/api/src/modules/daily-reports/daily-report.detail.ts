import { DISCIPLINE_CODES, type Discipline, addDays, attendanceOf } from "@sts/shared";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { findMachineryConflicts, findRoadConflicts } from "@/modules/daily-requests/daily-request.conflicts.js";
import { listBookingsForReport, listBookingsForTargetExcluding, listEquipmentRequests, listForecasts, listMachinery, listPermits, listRoadUsage, listRoadUsageForTargetExcluding } from "@/modules/daily-requests/daily-request.repository.js";
import { ForbiddenError, NotFoundError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import { getReportById, listAllocations, listCrews, listEquipment, listMaterials, listOvertime, listPhotos, listPositions } from "./daily-report.repository.js";

// A user acts for a contractor only through an active membership.
export async function assertContractorAccess(auth: AuthContext, contractorId: string, projectId: string) {
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id, projectId);
  if (!memberships.some((c) => c.id === contractorId)) {
    throw new ForbiddenError("You are not a member of this contractor", { contractorId });
  }
}

export async function loadOwnedReport(auth: AuthContext, reportId: string) {
  const report = await getReportById(getDb(), reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  await assertContractorAccess(auth, report.contractorId, report.projectId);
  return report;
}

export async function reportDetail(reportId: string) {
  const db = getDb();
  const report = await getReportById(db, reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  // machinery / permits / roadUsage on a report are the requests it raised for the next day.
  const tomorrow = addDays(report.reportDate, 1);
  const [positions, eveningPositions, crews, equipment, allocations, machinery, equipmentRequests, permits, roadUsage, photos, bookings, others, otherRoads, materials, forecasts, overtime] =
    await Promise.all([
      listPositions(db, reportId),
      listPositions(db, reportId, "evening"),
      listCrews(db, reportId),
      listEquipment(db, reportId),
      listAllocations(db, reportId),
      listMachinery(db, reportId),
      listEquipmentRequests(db, reportId),
      listPermits(db, reportId),
      listRoadUsage(db, reportId),
      listPhotos(db, reportId),
      listBookingsForReport(db, reportId),
      listBookingsForTargetExcluding(db, report.projectId, tomorrow, reportId),
      listRoadUsageForTargetExcluding(db, report.projectId, tomorrow, reportId),
      listMaterials(db, reportId),
      listForecasts(db, reportId),
      listOvertime(db, reportId),
    ]);
  const ownIds = new Set(bookings.map((b) => b.id));
  const conflicts = findMachineryConflicts([...bookings, ...others]).filter(
    (c) => ownIds.has(c.bookingIds[0]) || ownIds.has(c.bookingIds[1]),
  );
  const storage = getStorage();
  const photosWithUrls = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      category: p.category,
      fileName: p.fileName,
      contentType: p.contentType,
      sizeBytes: p.sizeBytes,
      createdAt: p.createdAt,
      // Storage outage must not break the report view.
      url: await storage.getPresignedUrl(p.objectKey, 3600).catch(() => null),
    })),
  );
  const { signatureData, ...header } = report;
  const totalHeadcount = report.thaiMale + report.thaiFemale + report.foreignMale + report.foreignFemale;
  return {
    ...header,
    totalHeadcount,
    ...attendanceOf(report),
    hasSignature: Boolean(signatureData),
    positions,
    eveningPositions,
    // Per-discipline breakdown (CE / ME / EE) of both shifts; positions/totals above are their sum.
    crews: crews.sort(
      (a, b) => DISCIPLINE_CODES.indexOf(a.discipline as Discipline) - DISCIPLINE_CODES.indexOf(b.discipline as Discipline),
    ),
    eveningHeadcount: eveningPositions.reduce((s, p) => s + p.headcount, 0),
    equipment,
    allocations,
    machinery,
    equipmentRequests,
    permits,
    roadUsage,
    materials,
    forecasts,
    overtime,
    requestsForDate: tomorrow,
    photos: photosWithUrls,
    roadConflicts: findRoadConflicts([...roadUsage, ...otherRoads])
      .filter((c) => roadUsage.some((r) => c.ids.includes(r.id)))
      .map((c) => ({
        roadLocation: c.roadLocation,
        with: otherRoads
          .filter((r) => c.ids.includes(r.id))
          .map((r) => ({ contractorCode: r.contractorCode, startTime: r.startTime, endTime: r.endTime, purpose: r.purpose })),
      })),
    machineryConflicts: conflicts.map((c) => ({
      ...c,
      with: [...others, ...bookings]
        .filter((b) => c.bookingIds.includes(b.id) && !ownIds.has(b.id))
        .map((b) => ({ contractorCode: b.contractorCode, buildingCode: b.buildingCode, startTime: b.startTime, endTime: b.endTime })),
    })),
  };
}

export type DailyReportDetail = Awaited<ReturnType<typeof reportDetail>>;

// ---- queries ---------------------------------------------------------------
