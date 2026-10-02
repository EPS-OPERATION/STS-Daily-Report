import { randomUUID } from "node:crypto";
import { ACCIDENT_CATEGORY_CODES, INJURY_CATEGORIES, manHours, type AccidentCategory, type FindingType } from "@sts/shared";
import { getDb } from "@/db/client.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { listReportHoursInRange } from "@/modules/daily-reports/daily-report.repository.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import {
  deleteFinding,
  firstReportDate,
  getFinding,
  insertFinding,
  listAccidents,
  listFindings,
  nextItemNo,
  updateFinding,
  type FindingRow,
} from "./safety.repository.js";

export interface FindingInput {
  observation: string;
  buildingId?: string | null;
  locationDetail?: string;
  actionToBeTaken: string;
  contractorId?: string | null;
  inspectionDate: string;
  expectedCompleteDate?: string | null;
  status: "open" | "done";
  findingType: FindingType;
}

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

async function assertProject(projectId: string) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
}

function assertEps(auth: AuthContext) {
  if (auth.user.role !== "eps") throw new ForbiddenError("Only EPS staff can record safety line walks");
}

function assertRange(from: string, to: string) {
  const d = days(from, to);
  if (!(d >= 0 && d <= 400)) throw new ValidationError("Date range must be 0–400 days", { from, to });
}

async function withPhotoUrls(rows: FindingRow[]) {
  const storage = getStorage();
  const url = (key: string | null) => (key ? storage.getPresignedUrl(key, 3600).catch(() => null) : Promise.resolve(null));
  return Promise.all(
    rows.map(async ({ findingPhotoKey, closePhotoKey, ...r }) => ({
      ...r,
      findingPhotoUrl: await url(findingPhotoKey),
      closePhotoUrl: await url(closePhotoKey),
    })),
  );
}

export async function listFindingsService(projectId: string, from: string, to: string) {
  await assertProject(projectId);
  assertRange(from, to);
  return withPhotoUrls(await listFindings(getDb(), projectId, from, to));
}

function clean(input: FindingInput) {
  if (input.expectedCompleteDate && input.expectedCompleteDate < input.inspectionDate) {
    throw new ValidationError("Expected complete date cannot be before the inspection date");
  }
  return {
    observation: input.observation.trim(),
    buildingId: input.buildingId ?? null,
    locationDetail: input.locationDetail?.trim() || null,
    actionToBeTaken: input.actionToBeTaken.trim(),
    contractorId: input.contractorId ?? null,
    inspectionDate: input.inspectionDate,
    expectedCompleteDate: input.expectedCompleteDate ?? null,
    status: input.status,
    findingType: input.findingType,
  };
}

export async function createFindingService(auth: AuthContext, projectId: string, input: FindingInput) {
  assertEps(auth);
  await assertProject(projectId);
  const values = clean(input);
  const db = getDb();
  const id = await insertFinding(db, {
    projectId,
    itemNo: await nextItemNo(db, projectId),
    ...values,
    closedAt: values.status === "done" ? new Date() : null,
    createdBy: auth.user.id,
  });
  return { id };
}

async function loadFinding(auth: AuthContext, projectId: string, findingId: string) {
  assertEps(auth);
  const row = await getFinding(getDb(), findingId);
  if (!row || row.projectId !== projectId) throw new NotFoundError("Finding not found", { findingId });
  return row;
}

export async function updateFindingService(auth: AuthContext, projectId: string, findingId: string, input: FindingInput) {
  const row = await loadFinding(auth, projectId, findingId);
  const values = clean(input);
  await updateFinding(getDb(), findingId, {
    ...values,
    // keep the first close time; reopening clears it
    closedAt: values.status === "done" ? (row.closedAt ?? new Date()) : null,
  });
  return { id: findingId };
}

export async function deleteFindingService(auth: AuthContext, projectId: string, findingId: string) {
  const row = await loadFinding(auth, projectId, findingId);
  await deleteFinding(getDb(), findingId);
  for (const key of [row.findingPhotoKey, row.closePhotoKey]) {
    if (key) await getStorage().remove(key).catch(() => undefined);
  }
}

export async function uploadFindingPhotoService(
  auth: AuthContext,
  projectId: string,
  findingId: string,
  kind: "finding" | "close",
  file: File,
) {
  const row = await loadFinding(auth, projectId, findingId);
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `safety/${projectId}/${findingId}/${kind}-${randomUUID()}.${ext}`;
  await getStorage().upload({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
  const old = kind === "finding" ? row.findingPhotoKey : row.closePhotoKey;
  await updateFinding(getDb(), findingId, kind === "finding" ? { findingPhotoKey: key } : { closePhotoKey: key });
  if (old) await getStorage().remove(old).catch(() => undefined);
  return { id: findingId };
}

// ---- statistics --------------------------------------------------------------

// Weekly safety statistic + dashboard for [from, to]. "Year" = 1 Jan of `to`'s year … `to`.
// Days without an accident count from the last injury (LTI / Non-LTI) or, if none,
// from the first daily report of the project.
export async function safetyStatsService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const yearStart = `${to.slice(0, 4)}-01-01`;
  const start = (await firstReportDate(db, projectId)) ?? from;
  const [allAccidents, findingsInRange, findingsYear, hoursRange, hoursTotal] = await Promise.all([
    listAccidents(db, projectId, start < yearStart ? start : yearStart, to),
    listFindings(db, projectId, from, to),
    listFindings(db, projectId, yearStart, to),
    listReportHoursInRange(db, projectId, from, to),
    listReportHoursInRange(db, projectId, start, to),
  ]);

  const inRange = (d: string, a: string, b: string) => d >= a && d <= b;
  const count = (cat: AccidentCategory, a: string, b: string) =>
    allAccidents.filter((x) => x.category === cat && inRange(x.reportDate, a, b)).length;
  const categories = ACCIDENT_CATEGORY_CODES.map((code) => ({
    code,
    period: count(code, from, to),
    year: count(code, yearStart, to),
  }));

  // Safety clock from injuries only.
  const injuries = [...new Set(allAccidents.filter((a) => INJURY_CATEGORIES.includes(a.category as AccidentCategory)).map((a) => a.reportDate))].sort();
  const lastInjury = injuries.at(-1) ?? null;
  const daysWithoutAccident = days(lastInjury ?? start, to);
  let highest = 0;
  let prev = start;
  for (const d of injuries) {
    highest = Math.max(highest, days(prev, d));
    prev = d;
  }
  highest = Math.max(highest, daysWithoutAccident);
  const lastLti = allAccidents.filter((a) => a.category === "lti").at(-1)?.reportDate ?? null;

  const nmh = (rows: typeof hoursRange) =>
    rows.reduce((s, h) => s + manHours(h.thaiMale + h.thaiFemale + h.foreignMale + h.foreignFemale, h.workHours, h.otHours), 0);

  const done = findingsInRange.filter((f) => f.status === "done").length;
  const byContractor = (type: FindingType) => {
    const m = new Map<string, number>();
    for (const f of findingsInRange.filter((x) => x.findingType === type)) {
      const k = f.contractorCode ?? "ไม่ระบุ";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([contractorCode, cases]) => ({ contractorCode, cases }));
  };
  const typeSummary = (type: FindingType) => {
    const list = findingsInRange.filter((x) => x.findingType === type);
    return { total: list.length, open: list.filter((x) => x.status === "open").length, byContractor: byContractor(type) };
  };

  const months = Array.from({ length: Number(to.slice(5, 7)) }, (_, i) => `${to.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`);
  const monthly = months.map((m) => ({
    month: m,
    nearMiss: allAccidents.filter((a) => a.category === "near_miss" && a.reportDate.startsWith(m)).length,
    inspections: findingsYear.filter((f) => f.inspectionDate.startsWith(m)).length,
  }));

  return {
    from,
    to,
    yearStart,
    projectStart: start,
    tiles: {
      accidents: categories.filter((c) => INJURY_CATEGORIES.includes(c.code)).reduce((s, c) => s + c.period, 0),
      lti: categories.find((c) => c.code === "lti")!.period,
      nearMiss: categories.find((c) => c.code === "near_miss")!.period,
      inspections: findingsInRange.length,
      closed: done,
      closedPct: findingsInRange.length ? Math.round((done / findingsInRange.length) * 100) : null,
    },
    categories,
    daysWithoutAccident,
    highestDaysWithoutAccident: highest,
    lastLti,
    manHoursPeriod: nmh(hoursRange),
    manHoursTotal: nmh(hoursTotal),
    unsafeAct: typeSummary("unsafe_act"),
    unsafeCondition: typeSummary("unsafe_condition"),
    monthly,
  };
}
