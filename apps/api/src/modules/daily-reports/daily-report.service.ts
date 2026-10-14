import { randomUUID } from "node:crypto";
import { DISCIPLINE_CODES, REQUEST_STATUSES, allocationPeak, canEditReport, dayManpower, timeWindowsOverlap, editDeadline, isEpsStaff, normalizePagination, workloadLevel, type Discipline, type PermitType, type RequestStatus } from "@sts/shared";
import { getEnv } from "@/config/env.js";
import { getDb } from "@/db/client.js";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { getProjectById, listProjectContractors } from "@/modules/projects/project.repository.js";
import { isContractorInProject } from "@/modules/site-activities/site-activity.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import { getContractorById } from "@/modules/contractors/contractor.repository.js";
import { listRequests } from "@/modules/inspection-requests/inspection-request.repository.js";
import { findMachineryConflicts, findRoadConflicts } from "./daily-report.conflicts.js";
import { getRoadUsageForProject, setRoadAdjustment } from "./daily-report.repository.js";
import {
  countPhotos,
  deletePhoto,
  ensureReport,
  getPhoto,
  getReportById,
  getReportByKey,
  getSafetyRecord,
  insertPhoto,
  listAllocations,
  listCrews,
  listAllocationsInRange,
  listAllocationDetailsInRange,
  listReportsForReview,
  countRequestsByStatusInRange,
  listEquipment,
  listEquipmentRequests,
  listEquipmentRequestsInRange,
  listMaterials,
  listForecasts,
  listForecastsInRange,
  listPermitDetailsInRange,
  listMaterialsLog,
  countMaterialsLog,
  summarizeMaterials,
  listPositions,
  listReportHoursInRange,
  listPositionsInRange,
  listBookingsForTargetExcluding,
  listPlannedForDate,
  listRoadUsage,
  listRoadUsageForTargetExcluding,
  listRoadUsageInRange,
  listBookingsForReport,
  listBookingsInRange,
  listMachinery,
  listPermits,
  listPermitsInRange,
  listPhotos,
  saveEvening,
  saveMorning,
  setReportReview,
} from "./daily-report.repository.js";
import type {
  CrewInput,
  EquipmentRequestInput,
  EveningInput,
  MachineryInput,
  MorningInput,
  PermitInput,
  PhotoUploadInput,
  ReviewInput,
  RoadUsageInput,
} from "./daily-report.type.js";

const MAX_PHOTOS = 12;

// ---- helpers ---------------------------------------------------------------

const round1 = (n: number) => Math.round(n * 10) / 10;

// Man-day / NMH of one contractor-day from whichever halves were sent (rule in dayManpower).
function attendanceOf(r: {
  morningStatus: string;
  eveningStatus: string;
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  eveningThaiMale: number | null;
  eveningThaiFemale: number | null;
  eveningForeignMale: number | null;
  eveningForeignFemale: number | null;
  workHours: number | null;
  otHours: number | null;
}) {
  const morning = r.morningStatus === "submitted" ? r.thaiMale + r.thaiFemale + r.foreignMale + r.foreignFemale : null;
  const evening =
    r.eveningStatus === "submitted" && r.eveningThaiMale !== null
      ? r.eveningThaiMale + (r.eveningThaiFemale ?? 0) + (r.eveningForeignMale ?? 0) + (r.eveningForeignFemale ?? 0)
      : null;
  return dayManpower({ morning, evening, workHours: r.workHours, otHours: r.otHours });
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Monday of the ISO week containing isoDate (calendar math in UTC, no TZ shift).
function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(isoDate, -dow);
}

async function assertProject(projectId: string) {
  const project = await getProjectById(getDb(), projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
}

// A user acts for a contractor only through an active membership.
async function assertContractorAccess(auth: AuthContext, contractorId: string, projectId: string) {
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id, projectId);
  if (!memberships.some((c) => c.id === contractorId)) {
    throw new ForbiddenError("You are not a member of this contractor", { contractorId });
  }
}

async function loadOwnedReport(auth: AuthContext, reportId: string) {
  const report = await getReportById(getDb(), reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  await assertContractorAccess(auth, report.contractorId, report.projectId);
  return report;
}

async function reportDetail(reportId: string) {
  const db = getDb();
  const report = await getReportById(db, reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  // machinery / permits / roadUsage on a report are the requests it raised for the next day.
  const tomorrow = addDays(report.reportDate, 1);
  const [positions, eveningPositions, crews, equipment, allocations, machinery, equipmentRequests, permits, roadUsage, photos, bookings, others, otherRoads, materials, forecasts] =
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

export async function getCurrentReportService(
  auth: AuthContext,
  projectId: string,
  date: string,
  contractorId?: string,
) {
  await assertProject(projectId);
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id, projectId);
  const contractor = contractorId ? memberships.find((c) => c.id === contractorId) : memberships[0];
  if (!contractor) {
    throw new ForbiddenError(
      contractorId ? "You are not a member of this contractor" : "Your account is not linked to a contractor",
      { contractorId },
    );
  }
  const db = getDb();
  const [report, planned, inspections] = await Promise.all([
    getReportByKey(db, projectId, contractor.id, date),
    listPlannedForDate(db, projectId, contractor.id, date),
    listRequests(db, projectId, { from: date, to: date, by: "inspection", contractorIds: [contractor.id] }),
  ]);
  return {
    contractor,
    report: report ? await reportDetail(report.id) : null,
    // Requested yesterday evening for today — shown read-only on the morning check-in.
    plannedToday: { ...planned, inspections: inspections.filter((r) => r.status !== "draft") },
  };
}

// Draft row so photos can be attached before any shift is sent.
export async function ensureDraftService(auth: AuthContext, projectId: string, date: string, contractorId: string) {
  await assertProject(projectId);
  await assertContractorAccess(auth, contractorId, projectId);
  if (!(await isContractorInProject(getDb(), projectId, contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId });
  }
  const row = await ensureReport(getDb(), projectId, contractorId, date);
  return reportDetail(row.id);
}

// ---- edit window -----------------------------------------------------------

// A sent shift can be edited until 12:00 site time the next day; trial mode lifts the limit.
// First-time (late) submissions are not affected — only changes to what was already sent.
function assertEditable(reportDate: string, what: string, reportId: string) {
  if (getEnv().ALLOW_RESUBMIT || canEditReport(reportDate)) return;
  throw new ConflictError(`${what} can no longer be edited — edits close at 12:00 the day after the report date`, {
    reportId,
    editableUntil: editDeadline(reportDate).toISOString(),
  });
}

// ---- crews -----------------------------------------------------------------

// A crew is valid when it has people, positions are unique and the nationality/sex split
// adds up to the same headcount. Returns that headcount.
function validateCrew(crew: CrewInput): number {
  const seen = new Set<string>();
  for (const p of crew.positions) {
    if (seen.has(p.position)) {
      throw new ValidationError("Each position may appear only once", { discipline: crew.discipline, position: p.position });
    }
    seen.add(p.position);
  }
  const total = crew.positions.reduce((sum, p) => sum + p.headcount, 0);
  if (total <= 0) throw new ValidationError("Total headcount must be greater than 0", { discipline: crew.discipline });
  const byNationality = crew.thaiMale + crew.thaiFemale + crew.foreignMale + crew.foreignFemale;
  if (byNationality !== total) {
    throw new ValidationError("Nationality/sex split must equal the headcount by position", {
      discipline: crew.discipline,
      byPosition: total,
      byNationality,
    });
  }
  return total;
}

// ---- morning ---------------------------------------------------------------

export async function submitMorningService(auth: AuthContext, projectId: string, input: MorningInput) {
  const db = getDb();
  await assertProject(projectId);
  await assertContractorAccess(auth, input.contractorId, projectId);
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }

  const existing = await getReportByKey(db, projectId, input.contractorId, input.date);
  // Shifts are independent. Re-sending the morning keeps the evening actuals of buildings
  // that stay allocated (see saveMorning).
  if (existing?.morningStatus === "submitted") assertEditable(input.date, "The morning report", existing.id);

  if (input.startTime >= input.endTime) {
    throw new ValidationError("End time must be after start time", { startTime: input.startTime, endTime: input.endTime });
  }

  const seenCrews = new Set<string>();
  for (const crew of input.crews) {
    if (seenCrews.has(crew.discipline)) throw new ValidationError("Each discipline may appear only once", { discipline: crew.discipline });
    seenCrews.add(crew.discipline);
  }
  const seenEquipment = new Set<string>();
  for (const e of input.equipment) {
    const name = e.equipmentType.trim();
    if (!name) throw new ValidationError("Equipment name is required");
    if (name.length > 120) throw new ValidationError("Equipment name is too long", { equipmentType: name });
    const key = name.toLowerCase();
    if (seenEquipment.has(key)) {
      throw new ValidationError("Each equipment type may appear only once", { equipmentType: e.equipmentType });
    }
    seenEquipment.add(key);
  }

  const buildingIds = new Set((await listBuildings(db, projectId)).map((b) => b.id));
  for (const crew of input.crews) {
    // Position headcount is the primary total; the nationality/sex split must describe the same people.
    const total = validateCrew(crew);
    for (const a of crew.allocations) {
      if (!buildingIds.has(a.buildingId)) throw new ValidationError("Unknown building", { buildingId: a.buildingId });
      if (Boolean(a.startTime) !== Boolean(a.endTime)) {
        throw new ValidationError("Give both start and end time for an activity, or neither (= all day)", { buildingId: a.buildingId });
      }
      if (a.startTime && a.endTime && a.startTime >= a.endTime) {
        throw new ValidationError("Activity end time must be after its start time", { startTime: a.startTime, endTime: a.endTime });
      }
    }
    // The same building may repeat in a discipline only for windows that do not overlap.
    crew.allocations.forEach((a, i) => {
      for (const b of crew.allocations.slice(i + 1)) {
        if (a.buildingId !== b.buildingId) continue;
        const overlap = timeWindowsOverlap(
          a.startTime ?? input.startTime,
          a.endTime ?? input.endTime,
          b.startTime ?? input.startTime,
          b.endTime ?? input.endTime,
        );
        if (overlap) {
          throw new ValidationError("The same building is listed twice for overlapping times", {
            discipline: crew.discipline,
            buildingId: a.buildingId,
          });
        }
      }
    });
    // Only impossible data is refused: more people working at the same moment than came today.
    // Leaving people unassigned or not covering the whole day is allowed.
    const peak = allocationPeak(crew.allocations, input.startTime, input.endTime);
    if (peak.placed > total) {
      throw new ValidationError("More people are placed at the same time than came to work", {
        discipline: crew.discipline,
        total,
        placed: peak.placed,
        from: peak.from,
        to: peak.to,
      });
    }
  }

  const reportId = await saveMorning(db, projectId, input, auth.user.id);
  return reportDetail(reportId);
}

// ---- evening ---------------------------------------------------------------

function validateTomorrow(
  buildingIds: Set<string>,
  machinery: MachineryInput[],
  equipment: EquipmentRequestInput[],
  permits: PermitInput[],
  roads: RoadUsageInput[],
  forecasts: { buildingId: string; description: string }[],
) {
  for (const f of forecasts) {
    if (!f.description.trim()) throw new ValidationError("Describe each forecast activity");
  }
  for (const b of [...machinery, ...equipment, ...permits, ...forecasts]) {
    if (!buildingIds.has(b.buildingId)) throw new ValidationError("Unknown building", { buildingId: b.buildingId });
  }
  for (const r of roads) {
    if (r.buildingId && !buildingIds.has(r.buildingId)) {
      throw new ValidationError("Unknown building", { buildingId: r.buildingId });
    }
  }
  for (const m of machinery) {
    if (Boolean(m.startTime) !== Boolean(m.endTime)) {
      throw new ValidationError("Give both start and end time, or neither (= all day)", { machineType: m.machineType });
    }
    if (m.startTime && m.endTime && m.startTime >= m.endTime) {
      throw new ValidationError("End time must be after start time", { startTime: m.startTime });
    }
  }
  for (const r of roads) {
    if (r.startTime >= r.endTime) throw new ValidationError("End time must be after start time", { startTime: r.startTime });
  }
  for (const p of permits) {
    if (p.permitType === "other" && !p.otherLabel?.trim()) throw new ValidationError("Describe the permit when type is Other");
    if (p.highRisk && (!p.taskName?.trim() || !p.supervisorName?.trim())) {
      throw new ValidationError("High-risk work needs a task name and an EPS supervisor", { permitType: p.permitType });
    }
  }
  for (const r of roads) {
    if (!r.roadLocation.trim() || !r.purpose.trim()) throw new ValidationError("Road usage needs a location and a purpose");
  }
}

// Independent of the morning shift: works whether or not a morning report exists.
export async function submitEveningService(auth: AuthContext, projectId: string, input: EveningInput) {
  const db = getDb();
  await assertProject(projectId);
  await assertContractorAccess(auth, input.contractorId, projectId);
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }
  const report = await getReportByKey(db, projectId, input.contractorId, input.date);
  if (report?.eveningStatus === "submitted") assertEditable(input.date, "The evening report", report.id);
  if (!report?.signatureData && !input.signatureData) {
    throw new ValidationError("กรุณาลงนามยืนยันก่อนส่งรายงาน");
  }

  if (input.accidentOccurred && !input.accidentNote?.trim()) {
    throw new ValidationError("Describe the accident when one occurred");
  }
  if (input.accidentOccurred && !input.accidentCategory) {
    throw new ValidationError("Choose the accident category");
  }
  const seenCrews = new Set<string>();
  for (const crew of input.crews) {
    if (seenCrews.has(crew.discipline)) throw new ValidationError("Each discipline may appear only once", { discipline: crew.discipline });
    seenCrews.add(crew.discipline);
    validateCrew(crew);
  }
  validateTomorrow(
    new Set((await listBuildings(db, projectId)).map((b) => b.id)),
    input.machinery,
    input.equipmentRequests,
    input.permits,
    input.roadUsage,
    input.forecasts ?? [],
  );
  // Materials on site: one row per material + unit, positive quantity.
  const seenMaterials = new Set<string>();
  for (const m of input.materials) {
    const name = m.name.trim();
    const unit = m.unit.trim();
    if (!name) throw new ValidationError("Material name is required");
    if (!unit) throw new ValidationError("Material unit is required", { material: name });
    if (!Number.isFinite(m.qty) || m.qty <= 0) {
      throw new ValidationError("Material quantity must be above 0", { material: name });
    }
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    if (seenMaterials.has(key)) {
      throw new ValidationError("Each material + unit may appear only once", { material: name });
    }
    seenMaterials.add(key);
  }

  // Actuals are only possible for buildings the morning shift planned.
  const allocations = report ? await listAllocations(db, report.id) : [];
  const byId = new Map(input.progress.map((p) => [p.allocationId, p]));
  const missing = allocations.filter((a) => !byId.has(a.id)).map((a) => a.buildingCode);
  if (missing.length > 0 || byId.size !== allocations.length) {
    throw new ValidationError("Report actual progress for every allocated building", { missing });
  }
  for (const a of allocations) {
    const p = byId.get(a.id)!;
    // No stated plan → actual % only, nothing to be "behind" against.
    if (a.planPercent !== null && p.actualPercent < a.planPercent && !p.countermeasure?.trim()) {
      throw new ValidationError("Countermeasure is required when actual progress is below plan", {
        buildingCode: a.buildingCode,
        planPercent: a.planPercent,
        actualPercent: p.actualPercent,
      });
    }
  }

  const reportId = await saveEvening(db, projectId, input, auth.user.id);
  return reportDetail(reportId);
}

// ---- EPS review ------------------------------------------------------------

// Owner-side QAQC decision on a submitted report. Contractors can never move
// review_status themselves — same guard shape as the inspection transition.
export async function reviewReportService(auth: AuthContext, reportId: string, input: ReviewInput) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can review daily reports");
  const report = await getReportById(getDb(), reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  if (report.morningStatus !== "submitted" && report.eveningStatus !== "submitted") {
    throw new ConflictError("Nothing submitted yet — there is no report to review", { reportId });
  }
  if (input.decision === "rejected" && !input.note?.trim()) {
    throw new ValidationError("Give the contractor a note describing what to fix");
  }
  await setReportReview(getDb(), reportId, {
    status: input.decision,
    note: input.note?.trim() ? input.note.trim() : null,
    userId: auth.user.id,
  });
  return reportDetail(reportId);
}

// ---- EPS review queue ------------------------------------------------------

// One row per contractor report for a date or date range. EPS sees every contractor (Image 2
// approval table); a contractor user sees only their own companies.
// Submission history: one row per contractor × day in the range — including days a contractor
// sent nothing (hasReport=false), so EPS can see who has not reported. EPS sees every project
// contractor; a contractor user sees only their own companies. No approval step.
export async function listReviewQueueService(
  auth: AuthContext,
  projectId: string,
  range: { date?: string; from?: string; to?: string },
) {
  await assertProject(projectId);
  const from = range.from ?? range.date ?? range.to;
  const to = range.to ?? range.date ?? range.from;
  if (!from || !to) throw new ValidationError("Give date, or from and to");
  const [start, end] = from <= to ? [from, to] : [to, from];
  assertRange(start, end);

  const db = getDb();
  const companies = isEpsStaff(auth.user.role)
    ? await listProjectContractors(db, projectId)
    : await listActiveContractorsForUser(db, auth.user.id, projectId);
  if (companies.length === 0) return [];
  const reports = await listReportsForReview(db, projectId, { from: start, to: end }, isEpsStaff(auth.user.role) ? undefined : companies.map((c) => c.id));
  const byKey = new Map(reports.map((r) => [`${r.contractorId}|${r.reportDate}`, r]));

  const days: string[] = [];
  for (let d = end; d >= start; d = addDays(d, -1)) days.push(d);
  return days.flatMap((reportDate) =>
    [...companies]
      .sort((x, y) => x.code.localeCompare(y.code))
      .map((c) => {
        const r = byKey.get(`${c.id}|${reportDate}`);
        return r
          ? toReviewRow(r)
          : {
              id: null,
              hasReport: false,
              contractorId: c.id,
              contractorCode: c.code,
              contractorName: c.name,
              reportDate,
              morningStatus: "draft",
              eveningStatus: "draft",
              totalHeadcount: 0,
              eveningHeadcount: 0,
              morningSubmittedAt: null,
              morningUpdatedAt: null,
              eveningSubmittedAt: null,
              eveningUpdatedAt: null,
              updatedAt: null,
              startTime: null,
              endTime: null,
              workHours: null,
              otHours: null,
            };
      }),
  );
}

function toReviewRow(r: {
  id: string;
  contractorId: string;
  contractorCode: string;
  contractorName: string;
  reportDate: string;
  morningStatus: string;
  eveningStatus: string;
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  eveningThaiMale: number | null;
  eveningThaiFemale: number | null;
  eveningForeignMale: number | null;
  eveningForeignFemale: number | null;
  morningSubmittedAt?: Date | null;
  morningUpdatedAt?: Date | null;
  eveningSubmittedAt?: Date | null;
  eveningUpdatedAt?: Date | null;
  updatedAt?: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  workHours?: number | null;
  otHours?: number | null;
}) {
  return {
    id: r.id as string | null,
    hasReport: true,
    contractorId: r.contractorId,
    contractorCode: r.contractorCode,
    contractorName: r.contractorName,
    reportDate: r.reportDate,
    morningStatus: r.morningStatus,
    eveningStatus: r.eveningStatus,
    totalHeadcount: r.thaiMale + r.thaiFemale + r.foreignMale + r.foreignFemale,
    eveningHeadcount: (r.eveningThaiMale ?? 0) + (r.eveningThaiFemale ?? 0) + (r.eveningForeignMale ?? 0) + (r.eveningForeignFemale ?? 0),
    morningSubmittedAt: r.morningSubmittedAt ? r.morningSubmittedAt.toISOString() : null,
    morningUpdatedAt: r.morningUpdatedAt ? r.morningUpdatedAt.toISOString() : null,
    eveningSubmittedAt: r.eveningSubmittedAt ? r.eveningSubmittedAt.toISOString() : null,
    eveningUpdatedAt: r.eveningUpdatedAt ? r.eveningUpdatedAt.toISOString() : null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    // Morning working window + evening OT (Work Done print header).
    startTime: r.startTime ?? null,
    endTime: r.endTime ?? null,
    workHours: r.workHours ?? null,
    otHours: r.otHours ?? null,
  };
}

export type ReviewQueueRow = ReturnType<typeof toReviewRow>;

// ---- materials dashboard ---------------------------------------------------
// EPS view of what contractors reported on site (open read, like weekly summary).
export async function materialsService(
  projectId: string,
  query: { from?: string; to?: string; search?: string; contractorId?: string; page?: string; pageSize?: string },
) {
  const db = getDb();
  await assertProject(projectId);
  const p = normalizePagination(query as Record<string, unknown>);
  const filter = {
    from: query.from,
    to: query.to,
    search: query.search?.trim() || undefined,
    contractorId: query.contractorId,
  };
  const [rows, total, summary] = await Promise.all([
    listMaterialsLog(db, projectId, { ...filter, limit: p.pageSize, offset: (p.page - 1) * p.pageSize }),
    countMaterialsLog(db, projectId, filter),
    summarizeMaterials(db, projectId, filter),
  ]);
  return {
    data: rows.map((r) => ({ ...r, qty: Number(r.qty) })),
    summary,
    meta: { page: p.page, pageSize: p.pageSize, total },
  };
}

// ---- photos ----------------------------------------------------------------

export async function uploadPhotoService(auth: AuthContext, reportId: string, input: PhotoUploadInput) {
  const report = await loadOwnedReport(auth, reportId);
  if (report.eveningStatus === "submitted") assertEditable(report.reportDate, "Photos", report.id);
  if ((await countPhotos(getDb(), reportId)) >= MAX_PHOTOS) {
    throw new ValidationError(`A report can hold at most ${MAX_PHOTOS} photos`);
  }
  const ext = (input.file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `daily-reports/${report.projectId}/${report.reportDate}/${report.id}/${input.category}/${randomUUID()}.${ext}`;
  await getStorage().upload({
    key,
    body: new Uint8Array(await input.file.arrayBuffer()),
    contentType: input.file.type,
  });
  const row = await insertPhoto(getDb(), {
    reportId,
    category: input.category,
    objectKey: key,
    fileName: input.file.name.slice(0, 200),
    contentType: input.file.type,
    sizeBytes: input.file.size,
    uploadedBy: auth.user.id,
  });
  return { id: row.id, category: row.category, fileName: row.fileName };
}

export async function deletePhotoService(auth: AuthContext, reportId: string, photoId: string) {
  const report = await loadOwnedReport(auth, reportId);
  if (report.eveningStatus === "submitted") assertEditable(report.reportDate, "Photos", report.id);
  const photo = await getPhoto(getDb(), reportId, photoId);
  if (!photo) throw new NotFoundError("Photo not found", { photoId });
  await deletePhoto(getDb(), photoId);
  // Orphaned bytes are harmless; a failed remove must not resurrect the row.
  await getStorage()
    .remove(photo.objectKey)
    .catch(() => undefined);
}

// ---- weekly building summary ----------------------------------------------

export async function weeklySummaryService(projectId: string, weekStartInput: string) {
  const db = getDb();
  await assertProject(projectId);
  const weekStart = mondayOf(weekStartInput);
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [buildings, allocations, permits, bookings, hours, requestCounts, roads, equipmentRequests] = await Promise.all([
    listBuildings(db, projectId),
    listAllocationsInRange(db, projectId, weekStart, weekEnd),
    listPermitsInRange(db, projectId, weekStart, weekEnd),
    listBookingsInRange(db, projectId, weekStart, weekEnd),
    listReportHoursInRange(db, projectId, weekStart, weekEnd),
    countRequestsByStatusInRange(db, projectId, weekStart, weekEnd),
    listRoadUsageInRange(db, projectId, weekStart, weekEnd),
    listEquipmentRequestsInRange(db, projectId, weekStart, weekEnd),
  ]);
  const roadClashes = new Set(findRoadConflicts(roads).flatMap((c) => c.ids));

  type Cell = {
    date: string;
    headcount: number;
    contractors: Map<string, { id: string; code: string; name: string; headcount: number }>;
    permits: Map<string, number>;
  };
  const cells = new Map<string, Cell>();
  const cellOf = (buildingId: string, date: string) => {
    const key = `${buildingId}|${date}`;
    let c = cells.get(key);
    if (!c) {
      c = { date, headcount: 0, contractors: new Map(), permits: new Map() };
      cells.set(key, c);
    }
    return c;
  };

  // Man-days: people × share of the day they spent in that building (crews that move count once).
  for (const a of allocations) {
    const c = cellOf(a.buildingId, a.reportDate);
    const manDays = a.headcount * a.dayShare;
    c.headcount = round1(c.headcount + manDays);
    const prev = c.contractors.get(a.contractorId);
    c.contractors.set(a.contractorId, {
      id: a.contractorId,
      code: a.contractorCode,
      name: a.contractorName,
      headcount: round1((prev?.headcount ?? 0) + manDays),
    });
  }
  for (const p of permits) {
    const c = cellOf(p.buildingId, p.targetDate);
    c.permits.set(p.permitType, (c.permits.get(p.permitType) ?? 0) + p.workers);
  }

  const rows = buildings.map((b) => {
    const dayCells = days.map((date) => {
      const c = cells.get(`${b.id}|${date}`);
      const contractors = c ? [...c.contractors.values()].sort((x, y) => y.headcount - x.headcount) : [];
      const headcount = c?.headcount ?? 0;
      return {
        date,
        headcount,
        contractors,
        permits: c ? [...c.permits.entries()].map(([type, workers]) => ({ type: type as PermitType, workers })) : [],
        level: workloadLevel(headcount, contractors.length),
      };
    });
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      nameTh: b.nameTh,
      weekManDays: round1(dayCells.reduce((s, c) => s + c.headcount, 0)),
      peakHeadcount: Math.max(0, ...dayCells.map((c) => c.headcount)),
      cells: dayCells,
    };
  });

  const conflicts = findMachineryConflicts(bookings);
  const conflicted = new Map<string, "conflict" | "possible">();
  for (const c of conflicts) {
    for (const id of c.bookingIds) {
      if (conflicted.get(id) !== "conflict") conflicted.set(id, c.severity);
    }
  }

  return {
    weekStart,
    weekEnd,
    days,
    buildings: rows,
    machinery: bookings.map((b) => ({ ...b, conflict: conflicted.get(b.id) ?? null })),
    conflicts,
    roads: roads.map((r) => ({ ...r, conflict: roadClashes.has(r.id) })),
    equipmentRequests,
    requests: Object.fromEntries(
      REQUEST_STATUSES.map((st) => [st, requestCounts.find((r) => r.status === st)?.n ?? 0]),
    ) as Record<RequestStatus, number>,
    totals: {
      manDays: rows.reduce((s, r) => s + r.weekManDays, 0),
      // Reports without hours (older rows) contribute 0 rather than a guess.
      manHours: hours.reduce(
        (s, h) => round1(s + attendanceOf(h).manHours),
        0,
      ),
      permitWorkers: permits.reduce((s, p) => s + p.workers, 0),
      bookings: bookings.length,
      conflicts: conflicts.filter((c) => c.severity === "conflict").length,
      possibleConflicts: conflicts.filter((c) => c.severity === "possible").length,
      roadConflicts: roadClashes.size,
    },
  };
}

export type WeeklySummary = Awaited<ReturnType<typeof weeklySummaryService>>;

// ---- charts ------------------------------------------------------------------

// Average daily headcount by position per contractor for the week (deck: "Headcount by Position").
// Averaged over the days each contractor actually reported, so a 3-day crew is not diluted.
function assertRange(from: string, to: string) {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (!(days >= 0 && days <= 62)) throw new ValidationError("Date range must be 0–62 days", { from, to });
}

export async function positionMixService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const rows = await listPositionsInRange(db, projectId, from, to);
  const days = new Map<string, Set<string>>();
  const sums = new Map<string, { contractorId: string; contractorCode: string; position: string; total: number }>();
  for (const r of rows) {
    (days.get(r.contractorId) ?? days.set(r.contractorId, new Set()).get(r.contractorId)!).add(r.reportDate);
    const key = `${r.contractorId}|${r.position}`;
    const cur = sums.get(key) ?? { contractorId: r.contractorId, contractorCode: r.contractorCode, position: r.position, total: 0 };
    cur.total += r.headcount;
    sums.set(key, cur);
  }
  return [...sums.values()].map((s) => ({
    contractorId: s.contractorId,
    contractorCode: s.contractorCode,
    position: s.position,
    totalHeadcount: s.total,
    avgPerDay: s.total,
  }));
}

// Average daily manpower per week for the last `weeks` weeks up to `until` (deck: "Avg. Manday movement").
// Average is over days that have at least one submitted morning report.
export async function manpowerTrendService(projectId: string, until: string, weeks: number) {
  const db = getDb();
  await assertProject(projectId);
  const lastWeek = mondayOf(until);
  const firstWeek = addDays(lastWeek, -7 * (weeks - 1));
  const rows = await listReportHoursInRange(db, projectId, firstWeek, addDays(lastWeek, 6));
  const byDay = new Map<string, number>();
  for (const r of rows) {
    byDay.set(r.reportDate, round1((byDay.get(r.reportDate) ?? 0) + attendanceOf(r).manDays));
  }
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(firstWeek, i * 7);
    const daily = Array.from({ length: 7 }, (_, d) => byDay.get(addDays(weekStart, d))).filter((n): n is number => n !== undefined);
    const manDays = daily.reduce((s, n) => s + n, 0);
    return {
      weekStart,
      weekEnd: addDays(weekStart, 6),
      reportedDays: daily.length,
      manDays,
      // null (not 0) when nobody reported — the chart shows a gap, not a false drop.
      avgDaily: daily.length ? Math.round(manDays / daily.length) : null,
    };
  });
}

// Manpower page: per-contractor totals (man-days, NMH, nationality/sex) and the
// per-day headcount behind the stacked chart. Headcount = morning nationality split.
export async function manpowerSummaryService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const [rows, allocations, buildingList] = await Promise.all([
    listReportHoursInRange(db, projectId, from, to),
    listAllocationsInRange(db, projectId, from, to),
    listBuildings(db, projectId),
  ]);
  const byContractor = new Map<
    string,
    { contractorId: string; contractorCode: string; manDays: number; manHours: number; reportedDays: number; thaiMale: number; thaiFemale: number; foreignMale: number; foreignFemale: number }
  >();
  const daily: { date: string; contractorCode: string; headcount: number }[] = [];
  for (const r of rows) {
    const { manDays: headcount, manHours: hours } = attendanceOf(r);
    const c = byContractor.get(r.contractorId) ?? {
      contractorId: r.contractorId,
      contractorCode: r.contractorCode,
      manDays: 0,
      manHours: 0,
      reportedDays: 0,
      thaiMale: 0,
      thaiFemale: 0,
      foreignMale: 0,
      foreignFemale: 0,
    };
    c.manDays = round1(c.manDays + headcount);
    c.manHours = round1(c.manHours + hours);
    c.reportedDays += 1;
    c.thaiMale += r.thaiMale;
    c.thaiFemale += r.thaiFemale;
    c.foreignMale += r.foreignMale;
    c.foreignFemale += r.foreignFemale;
    byContractor.set(r.contractorId, c);
    daily.push({ date: r.reportDate, contractorCode: r.contractorCode, headcount });
  }
  const contractors = [...byContractor.values()].sort((a, b) => b.manDays - a.manDays);
  const days = new Set(rows.map((r) => r.reportDate)).size;
  // Man-days per building (site order), split by contractor — from the morning allocation.
  const perBuilding = new Map<string, Map<string, number>>();
  for (const a of allocations) {
    const m = perBuilding.get(a.buildingId) ?? new Map<string, number>();
    m.set(a.contractorCode, round1((m.get(a.contractorCode) ?? 0) + a.headcount * a.dayShare));
    perBuilding.set(a.buildingId, m);
  }
  const byBuilding = buildingList.map((b) => ({
    buildingId: b.id,
    code: b.code,
    name: b.name,
    contractors: Object.fromEntries(perBuilding.get(b.id) ?? []),
  }));
  return {
    from,
    to,
    contractors,
    daily,
    byBuilding,
    totals: {
      manDays: contractors.reduce((s, c) => s + c.manDays, 0),
      manHours: contractors.reduce((s, c) => s + c.manHours, 0),
      reportedDays: days,
      avgDaily: days ? Math.round(contractors.reduce((s, c) => s + c.manDays, 0) / days) : 0,
    },
  };
}

// Site plan: everything happening in each building on one day — people and work
// (morning allocation) plus what was requested for that day (evening before).
// Range-aware: for one day `headcount` = people that day; for a range it is man-days
// (sum over days) and `avgDaily` = man-days / days with any report in the range.
export async function siteDayService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const [buildingList, allocations, machinery, equipment, roads, permits, inspections] = await Promise.all([
    listBuildings(db, projectId),
    listAllocationDetailsInRange(db, projectId, from, to),
    listBookingsInRange(db, projectId, from, to),
    listEquipmentRequestsInRange(db, projectId, from, to),
    listRoadUsageInRange(db, projectId, from, to),
    listPermitsInRange(db, projectId, from, to),
    listRequests(db, projectId, { from, to, by: "inspection" }),
  ]);
  const machineClash = new Set(findMachineryConflicts(machinery).flatMap((c) => c.bookingIds));
  const reportedDays = Math.max(1, new Set(allocations.map((a) => a.reportDate)).size);
  return {
    date: from,
    from,
    to,
    reportedDays,
    buildings: buildingList.map((b) => {
      const work = allocations.filter((a) => a.buildingId === b.id);
      const contractors = [...new Set(work.map((a) => a.contractorCode))];
      // One day: people who worked there. Range: man-days, weighted by time spent in the building.
      const manDays = round1(work.reduce((s, a) => s + a.headcount * a.dayShare, 0));
      const headcount = from === to ? work.reduce((s, a) => s + a.headcount, 0) : manDays;
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        nameTh: b.nameTh,
        headcount,
        avgDaily: Math.round(manDays / reportedDays),
        contractors,
        activities: work,
        machinery: machinery.filter((m) => m.buildingId === b.id).map((m) => ({ ...m, conflict: machineClash.has(m.id) })),
        equipment: equipment.filter((e) => e.buildingId === b.id),
        roads: roads.filter((r) => r.buildingId === b.id),
        permits: permits.filter((p) => p.buildingId === b.id),
        inspections: inspections.filter((r) => r.buildingId === b.id && r.status !== "draft"),
      };
    }),
  };
}

// Daily Request page: everything requested for target dates in [from, to].
export async function dailyRequestsService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const [machinery, equipment, roads, permits, forecasts] = await Promise.all([
    listBookingsInRange(db, projectId, from, to),
    listEquipmentRequestsInRange(db, projectId, from, to),
    listRoadUsageInRange(db, projectId, from, to),
    listPermitDetailsInRange(db, projectId, from, to),
    listForecastsInRange(db, projectId, from, to),
  ]);
  const conflicts = findMachineryConflicts(machinery);
  const clash = new Map<string, "conflict" | "possible">();
  for (const c of conflicts) for (const id of c.bookingIds) if (clash.get(id) !== "conflict") clash.set(id, c.severity);
  const roadClash = new Set(findRoadConflicts(roads).flatMap((c) => c.ids));
  return {
    from,
    to,
    machinery: machinery.map((m) => ({ ...m, conflict: clash.get(m.id) ?? null })),
    equipmentRequests: equipment,
    roads: roads.map((r) => ({ ...r, conflict: roadClash.has(r.id) })),
    permits,
    forecasts,
  };
}

// ---- printable report ------------------------------------------------------

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// Everything the printed "Daily Request & Report" sheet needs for one contractor-day:
// the report, the signature image, today's permits (asked for the evening before), tomorrow's
// QAQC requests and the accident record. EPS reads any report; a contractor only its own.
export async function printReportService(auth: AuthContext, reportId: string) {
  const db = getDb();
  const report = await getReportById(db, reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  if (!isEpsStaff(auth.user.role)) await assertContractorAccess(auth, report.contractorId, report.projectId);

  const [detail, project, contractor, planned, qaqc, record] = await Promise.all([
    reportDetail(reportId),
    getProjectById(db, report.projectId),
    getContractorById(db, report.contractorId),
    listPlannedForDate(db, report.projectId, report.contractorId, report.reportDate),
    listRequests(db, report.projectId, {
      from: report.reportDate,
      to: report.reportDate,
      by: "report",
      contractorIds: [report.contractorId],
    }),
    getSafetyRecord(db, report.projectId, report.contractorId, report.reportDate),
  ]);
  const since = record.lastAccident ?? record.firstReport ?? report.reportDate;
  return {
    ...detail,
    signatureData: report.signatureData,
    projectName: project?.name ?? "",
    contractorCode: contractor?.code ?? "",
    contractorName: contractor?.name ?? "",
    permitsToday: planned.permits,
    inspections: qaqc.filter((r) => r.status !== "draft"),
    safetyRecord: {
      accidents: record.accidents,
      daysSinceLastAccident: Math.max(0, daysBetween(since, report.reportDate) + (record.lastAccident ? 0 : 1)),
      lastAccidentDate: record.lastAccident,
    },
  };
}

export type PrintReport = Awaited<ReturnType<typeof printReportService>>;

// EPS only: settle a road booking on another time. The request stays on the row; the adjusted window is what
// conflicts, lists and print use. Setting the request's own times again clears the change.
export async function adjustRoadUsageService(auth: AuthContext, projectId: string, id: string, input: { startTime: string; endTime: string }) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can change road usage times");
  await assertProject(projectId);
  if (input.startTime >= input.endTime) throw new ValidationError("End time must be after start time", { startTime: input.startTime });
  const db = getDb();
  const row = await getRoadUsageForProject(db, projectId, id);
  if (!row) throw new NotFoundError("Road usage booking not found", { id });
  const unchanged = input.startTime === row.requestedStartTime && input.endTime === row.requestedEndTime;
  await setRoadAdjustment(
    db,
    id,
    unchanged ? null : { startTime: input.startTime, endTime: input.endTime, byId: auth.user.id, at: new Date() },
  );
  const updated = await getRoadUsageForProject(db, projectId, id);
  if (!updated) throw new NotFoundError("Road usage booking not found", { id });
  return updated;
}
