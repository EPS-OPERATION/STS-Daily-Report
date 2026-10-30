import { addDays, isEpsStaff } from "@sts/shared";
import { randomUUID } from "node:crypto";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getContractorById } from "@/modules/contractors/contractor.repository.js";
import { listPlannedForDate } from "@/modules/daily-requests/daily-request.repository.js";
import { listRequests } from "@/modules/inspection-requests/inspection-request.repository.js";
import { assertProject } from "@/modules/projects/project.guard.js";
import { getProjectById, listProjectContractors } from "@/modules/projects/project.repository.js";
import { isContractorInProject } from "@/modules/site-activities/site-activity.repository.js";
import { assertRange } from "@/shared/date-range.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import { assertContractorAccess, loadOwnedReport, reportDetail } from "./daily-report.detail.js";
import { countPhotos, deletePhoto, ensureReport, getPhoto, getReportById, getReportByKey, getSafetyRecord, insertPhoto, listReportsForReview, setReportReview } from "./daily-report.repository.js";
import { assertEditable } from "./daily-report.submit.js";
import type { PhotoUploadInput, ReviewInput } from "./daily-report.type.js";

const MAX_PHOTOS = 12;

// ---- helpers ---------------------------------------------------------------

export async function getCurrentReportService(
  auth: AuthContext,
  projectId: string,
  date: string,
  contractorId?: string,
) {
  await assertProject(projectId);
  // EPS staff read any contractor of the project (the review dialog); contractors only their own companies.
  const memberships =
    isEpsStaff(auth.user.role) && contractorId
      ? (await listProjectContractors(getDb(), projectId)).map((c) => ({ ...c, projectId }))
      : await listActiveContractorsForUser(getDb(), auth.user.id, projectId);
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
    // Requested yesterday evening for today — shown read-only on the morning report.
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

export async function uploadPhotoService(auth: AuthContext, reportId: string, input: PhotoUploadInput) {
  const report = await loadOwnedReport(auth, reportId);
  // Permit photos belong to the morning report, the others to the evening one: each follows its own shift's lock.
  if ((input.category === "permit" ? report.morningStatus : report.eveningStatus) === "submitted") assertEditable(report.reportDate, "Photos", report.id);
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
    permitKey: input.category === "permit" ? input.permitKey ?? null : null,
  });
  return { id: row.id, category: row.category, fileName: row.fileName };
}

export async function deletePhotoService(auth: AuthContext, reportId: string, photoId: string) {
  const report = await loadOwnedReport(auth, reportId);
  const photo = await getPhoto(getDb(), reportId, photoId);
  if (!photo) throw new NotFoundError("Photo not found", { photoId });
  if ((photo.category === "permit" ? report.morningStatus : report.eveningStatus) === "submitted") assertEditable(report.reportDate, "Photos", report.id);
  await deletePhoto(getDb(), photoId);
  // Orphaned bytes are harmless; a failed remove must not resurrect the row.
  await getStorage()
    .remove(photo.objectKey)
    .catch(() => undefined);
}

// ---- weekly building summary ----------------------------------------------

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
