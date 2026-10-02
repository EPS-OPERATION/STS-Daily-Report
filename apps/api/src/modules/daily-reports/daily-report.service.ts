import { randomUUID } from "node:crypto";
import { REQUEST_STATUSES, manHours, normalizePagination, workloadLevel, type PermitType, type RequestStatus } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { isContractorInProject } from "@/modules/site-activities/site-activity.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import { listRequests } from "@/modules/inspection-requests/inspection-request.repository.js";
import { findMachineryConflicts, findRoadConflicts } from "./daily-report.conflicts.js";
import {
  countPhotos,
  deletePhoto,
  ensureReport,
  getPhoto,
  getReportById,
  getReportByKey,
  insertPhoto,
  listAllocations,
  listAllocationsInRange,
  listAllocationDetailsInRange,
  listReportsForReview,
  countRequestsByStatusInRange,
  listEquipment,
  listEquipmentRequests,
  listEquipmentRequestsInRange,
  listMaterials,
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
async function assertContractorAccess(auth: AuthContext, contractorId: string) {
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id);
  if (!memberships.some((c) => c.id === contractorId)) {
    throw new ForbiddenError("You are not a member of this contractor", { contractorId });
  }
}

async function loadOwnedReport(auth: AuthContext, reportId: string) {
  const report = await getReportById(getDb(), reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  await assertContractorAccess(auth, report.contractorId);
  return report;
}

async function reportDetail(reportId: string) {
  const db = getDb();
  const report = await getReportById(db, reportId);
  if (!report) throw new NotFoundError("Daily report not found", { reportId });
  // machinery / permits / roadUsage on a report are the requests it raised for the next day.
  const tomorrow = addDays(report.reportDate, 1);
  const [positions, equipment, allocations, machinery, equipmentRequests, permits, roadUsage, photos, bookings, others, otherRoads, materials] =
    await Promise.all([
      listPositions(db, reportId),
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
    manHours: manHours(totalHeadcount, report.workHours, report.otHours),
    hasSignature: Boolean(signatureData),
    positions,
    equipment,
    allocations,
    machinery,
    equipmentRequests,
    permits,
    roadUsage,
    materials,
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
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id);
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
  await assertContractorAccess(auth, contractorId);
  if (!(await isContractorInProject(getDb(), projectId, contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId });
  }
  const row = await ensureReport(getDb(), projectId, contractorId, date);
  return reportDetail(row.id);
}

// ---- morning ---------------------------------------------------------------

export async function submitMorningService(auth: AuthContext, projectId: string, input: MorningInput) {
  const db = getDb();
  await assertProject(projectId);
  await assertContractorAccess(auth, input.contractorId);
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }

  const existing = await getReportByKey(db, projectId, input.contractorId, input.date);
  // Shifts are independent. The morning only locks once BOTH shifts are in: re-sending it
  // then would wipe allocations the evening already reported actuals against.
  if (existing?.morningStatus === "submitted" && existing.eveningStatus === "submitted") {
    throw new ConflictError("Both shifts are submitted — the morning check-in is locked", { reportId: existing.id });
  }

  if (input.startTime >= input.endTime) {
    throw new ValidationError("End time must be after start time", { startTime: input.startTime, endTime: input.endTime });
  }

  // Position headcount is the primary total; the nationality/sex split must describe the same people.
  const seenPositions = new Set<string>();
  for (const p of input.positions) {
    if (seenPositions.has(p.position)) throw new ValidationError("Each position may appear only once", { position: p.position });
    seenPositions.add(p.position);
  }
  const total = input.positions.reduce((s, p) => s + p.headcount, 0);
  if (total <= 0) throw new ValidationError("Total headcount must be greater than 0");
  const byNationality = input.thaiMale + input.thaiFemale + input.foreignMale + input.foreignFemale;
  if (byNationality !== total) {
    throw new ValidationError("Nationality/sex split must equal the headcount by position", {
      byPosition: total,
      byNationality,
    });
  }
  const seenEquipment = new Set<string>();
  for (const e of input.equipment) {
    if (seenEquipment.has(e.equipmentType)) {
      throw new ValidationError("Each equipment type may appear only once", { equipmentType: e.equipmentType });
    }
    seenEquipment.add(e.equipmentType);
  }

  // Hard rule: every person is placed in exactly one building.
  const allocated = input.allocations.reduce((s, a) => s + a.headcount, 0);
  if (allocated !== total) {
    throw new ValidationError("Allocated headcount must equal total headcount", {
      total,
      allocated,
      remaining: total - allocated,
    });
  }

  const buildingIds = new Set((await listBuildings(db, projectId)).map((b) => b.id));
  const seenBuildings = new Set<string>();
  for (const a of input.allocations) {
    if (!buildingIds.has(a.buildingId)) throw new ValidationError("Unknown building", { buildingId: a.buildingId });
    if (seenBuildings.has(a.buildingId)) {
      throw new ValidationError("Each building may appear only once in the allocation", { buildingId: a.buildingId });
    }
    seenBuildings.add(a.buildingId);
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
) {
  for (const b of [...machinery, ...equipment, ...permits, ...roads]) {
    if (!buildingIds.has(b.buildingId)) throw new ValidationError("Unknown building", { buildingId: b.buildingId });
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
  }
  for (const r of roads) {
    if (!r.roadLocation.trim() || !r.purpose.trim()) throw new ValidationError("Road usage needs a location and a purpose");
  }
}

// Independent of the morning shift: works whether or not a morning report exists.
export async function submitEveningService(auth: AuthContext, projectId: string, input: EveningInput) {
  const db = getDb();
  await assertProject(projectId);
  await assertContractorAccess(auth, input.contractorId);
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }
  const report = await getReportByKey(db, projectId, input.contractorId, input.date);
  if (report?.eveningStatus === "submitted") {
    throw new ConflictError("Evening report already submitted", { reportId: report.id });
  }

  if (input.accidentOccurred && !input.accidentNote?.trim()) {
    throw new ValidationError("Describe the accident when one occurred");
  }
  if (input.accidentOccurred && !input.accidentCategory) {
    throw new ValidationError("Choose the accident category");
  }
  validateTomorrow(
    new Set((await listBuildings(db, projectId)).map((b) => b.id)),
    input.machinery,
    input.equipmentRequests,
    input.permits,
    input.roadUsage,
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
    if (p.actualPercent < a.planPercent && !p.countermeasure?.trim()) {
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
  if (auth.user.role !== "eps") throw new ForbiddenError("Only EPS staff can review daily reports");
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
export async function listReviewQueueService(
  auth: AuthContext,
  projectId: string,
  range: { date?: string; from?: string; to?: string },
) {
  await assertProject(projectId);
  if (auth.user.role === "eps") {
    const rows = await listReportsForReview(getDb(), projectId, range);
    return rows.map(toReviewRow);
  }
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id);
  if (memberships.length === 0) return [];
  const rows = await listReportsForReview(
    getDb(),
    projectId,
    range,
    memberships.map((c) => c.id),
  );
  return rows.map(toReviewRow);
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
  reviewStatus: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
}) {
  return {
    ...r,
    totalHeadcount: r.thaiMale + r.thaiFemale + r.foreignMale + r.foreignFemale,
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
  if (report.eveningStatus === "submitted") throw new ConflictError("Report already submitted — photos are locked");
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
  if (report.eveningStatus === "submitted") throw new ConflictError("Report already submitted — photos are locked");
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

  for (const a of allocations) {
    const c = cellOf(a.buildingId, a.reportDate);
    c.headcount += a.headcount;
    const prev = c.contractors.get(a.contractorId);
    c.contractors.set(a.contractorId, {
      id: a.contractorId,
      code: a.contractorCode,
      name: a.contractorName,
      headcount: (prev?.headcount ?? 0) + a.headcount,
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
      weekManDays: dayCells.reduce((s, c) => s + c.headcount, 0),
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
        (s, h) => s + manHours(h.thaiMale + h.thaiFemale + h.foreignMale + h.foreignFemale, h.workHours, h.otHours),
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
    avgPerDay: Math.round((s.total / (days.get(s.contractorId)?.size || 1)) * 10) / 10,
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
    byDay.set(r.reportDate, (byDay.get(r.reportDate) ?? 0) + r.thaiMale + r.thaiFemale + r.foreignMale + r.foreignFemale);
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
    const headcount = r.thaiMale + r.thaiFemale + r.foreignMale + r.foreignFemale;
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
    c.manDays += headcount;
    c.manHours += manHours(headcount, r.workHours, r.otHours);
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
    m.set(a.contractorCode, (m.get(a.contractorCode) ?? 0) + a.headcount);
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
      const headcount = work.reduce((s, a) => s + a.headcount, 0);
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        nameTh: b.nameTh,
        headcount,
        avgDaily: Math.round(headcount / reportedDays),
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
  const [machinery, equipment, roads] = await Promise.all([
    listBookingsInRange(db, projectId, from, to),
    listEquipmentRequestsInRange(db, projectId, from, to),
    listRoadUsageInRange(db, projectId, from, to),
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
  };
}
