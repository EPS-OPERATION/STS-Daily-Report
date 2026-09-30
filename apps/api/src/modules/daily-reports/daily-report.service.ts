import { randomUUID } from "node:crypto";
import { REQUEST_STATUSES, manHours, workloadLevel, type PermitType, type RequestStatus } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { isContractorInProject } from "@/modules/site-activities/site-activity.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import { findMachineryConflicts } from "./daily-report.conflicts.js";
import {
  countPhotos,
  deletePhoto,
  getPhoto,
  getReportById,
  getReportByKey,
  insertPhoto,
  listAllocations,
  listAllocationsInRange,
  countRequestsByStatusInRange,
  listEquipment,
  listPositions,
  listReportHoursInRange,
  listBookingsForDateExcluding,
  listBookingsForReport,
  listBookingsInRange,
  listMachinery,
  listPermits,
  listPermitsInRange,
  listPhotos,
  saveEvening,
  saveMorning,
} from "./daily-report.repository.js";
import type { EveningInput, MorningInput, PhotoUploadInput } from "./daily-report.type.js";

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
  const [positions, equipment, allocations, machinery, permits, photos, bookings] = await Promise.all([
    listPositions(db, reportId),
    listEquipment(db, reportId),
    listAllocations(db, reportId),
    listMachinery(db, reportId),
    listPermits(db, reportId),
    listPhotos(db, reportId),
    listBookingsForReport(db, reportId),
  ]);
  const others = await listBookingsForDateExcluding(db, report.projectId, report.reportDate, reportId);
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
    permits,
    photos: photosWithUrls,
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
  const report = await getReportByKey(getDb(), projectId, contractor.id, date);
  return { contractor, report: report ? await reportDetail(report.id) : null };
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
  if (existing?.eveningStatus === "submitted") {
    throw new ConflictError("Evening report already submitted — the morning shift is locked", { reportId: existing.id });
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
  const allocByBuilding = new Map<string, number>();
  for (const a of input.allocations) {
    if (!buildingIds.has(a.buildingId)) throw new ValidationError("Unknown building", { buildingId: a.buildingId });
    if (allocByBuilding.has(a.buildingId)) {
      throw new ValidationError("Each building may appear only once in the allocation", { buildingId: a.buildingId });
    }
    allocByBuilding.set(a.buildingId, a.headcount);
  }

  for (const m of input.machinery) {
    if (!buildingIds.has(m.buildingId)) throw new ValidationError("Unknown building", { buildingId: m.buildingId });
    if (m.startTime >= m.endTime) {
      throw new ValidationError("Machine booking end time must be after start time", { machineType: m.machineType });
    }
  }

  // Permit workers are a subset of the crew placed in that building.
  const permitWorkers = new Map<string, number>();
  for (const p of input.permits) {
    const placed = allocByBuilding.get(p.buildingId);
    if (placed === undefined) {
      throw new ValidationError("Permit building has no allocated workers", { buildingId: p.buildingId });
    }
    if (p.permitType === "other" && !p.otherLabel?.trim()) {
      throw new ValidationError("Describe the permit when type is Other");
    }
    const key = `${p.buildingId}|${p.permitType}`;
    permitWorkers.set(key, (permitWorkers.get(key) ?? 0) + p.workers);
    if (permitWorkers.get(key)! > placed) {
      throw new ValidationError("Permit workers exceed the headcount allocated to that building", {
        buildingId: p.buildingId,
        permitType: p.permitType,
        allocated: placed,
      });
    }
  }

  const reportId = await saveMorning(db, projectId, input, auth.user.id);
  return reportDetail(reportId);
}

// ---- evening ---------------------------------------------------------------

export async function submitEveningService(auth: AuthContext, reportId: string, input: EveningInput) {
  const report = await loadOwnedReport(auth, reportId);
  if (report.morningStatus !== "submitted") {
    throw new ConflictError("Submit the morning check-in before the evening report");
  }
  if (report.eveningStatus === "submitted") {
    throw new ConflictError("Evening report already submitted");
  }

  if (input.accidentOccurred && !input.accidentNote?.trim()) {
    throw new ValidationError("Describe the accident when one occurred");
  }

  const allocations = await listAllocations(getDb(), reportId);
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

  await saveEvening(getDb(), reportId, input, auth.user.id);
  return reportDetail(reportId);
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

  const [buildings, allocations, permits, bookings, hours, requestCounts] = await Promise.all([
    listBuildings(db, projectId),
    listAllocationsInRange(db, projectId, weekStart, weekEnd),
    listPermitsInRange(db, projectId, weekStart, weekEnd),
    listBookingsInRange(db, projectId, weekStart, weekEnd),
    listReportHoursInRange(db, projectId, weekStart, weekEnd),
    countRequestsByStatusInRange(db, projectId, weekStart, weekEnd),
  ]);

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
    const c = cellOf(p.buildingId, p.reportDate);
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
    },
  };
}

export type WeeklySummary = Awaited<ReturnType<typeof weeklySummaryService>>;
