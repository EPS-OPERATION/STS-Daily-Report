import { randomUUID } from "node:crypto";
import { ACCIDENT_CATEGORY_CODES, INJURY_CATEGORIES, isEpsStaff, mondayOf, type AccidentCategory, type FindingType } from "@sts/shared";
import { getDb } from "@/db/client.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { sumReportManHours } from "@/modules/report-summaries/index.js";
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
  renumberWeek,
  updateFinding,
  type FindingRow,
} from "./safety.repository.js";
import { firstSafetyStatDate, getSafetyBaseline, listSafetyStatEntries, listSafetyStatYearOverrides } from "./safety-stat.repository.js";

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
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can record safety line walks");
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

// Two saves racing for the same item_no / week_no hit a unique key (23505); the next try reads the new max.
async function retryOnNumberClash<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const outer = error as { code?: string; cause?: { code?: string } };
      if ((outer.cause ?? outer).code !== "23505" || attempt >= 12) throw error;
      // each round lets one writer through, so spread the losers out a little
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 25));
    }
  }
}

export async function createFindingService(auth: AuthContext, projectId: string, input: FindingInput) {
  assertEps(auth);
  await assertProject(projectId);
  const values = clean(input);
  const db = getDb();
  const id = await retryOnNumberClash(() =>
    insertFinding(
      db,
      { projectId, ...values, closedAt: values.status === "done" ? new Date() : null, createdBy: auth.user.id },
      mondayOf(values.inspectionDate),
    ),
  );
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
  // Moving the inspection date into another ISO week = next number of that week (the old week keeps a gap).
  const weekStart = mondayOf(values.inspectionDate);
  const moveToWeek = weekStart !== row.weekStart ? { projectId, weekStart } : undefined;
  await retryOnNumberClash(() =>
    updateFinding(
      getDb(),
      findingId,
      {
        ...values,
        // keep the first close time; reopening clears it
        closedAt: values.status === "done" ? (row.closedAt ?? new Date()) : null,
      },
      moveToWeek,
    ),
  );
  return { id: findingId };
}

// EPS tidy-up before a weekly report goes out: numbers of one ISO week become 1..N by inspection date.
export async function renumberWeekService(auth: AuthContext, projectId: string, date: string) {
  assertEps(auth);
  await assertProject(projectId);
  const weekStart = mondayOf(date);
  const count = await renumberWeek(getDb(), projectId, weekStart);
  return { weekStart, count };
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
  // The safety clock starts at the first contractor report or the first EPS manual entry.
  const [reportStart, manualStart] = await Promise.all([
    firstReportDate(db, projectId),
    firstSafetyStatDate(db, projectId),
  ]);
  const baselineStart = (await getSafetyBaseline(db, projectId))?.projectStartDate ?? null;
  const startCandidate = [reportStart, manualStart, baselineStart].filter((d): d is string => Boolean(d)).sort()[0] ?? from;
  // A historical range may end before the project's first report/manual entry.
  const start = startCandidate <= to ? startCandidate : from;

  const [allAccidents, findingsInRange, findingsYear, manHoursPeriod, manHoursTotal, manualEntries, yearOverrides, baseline] = await Promise.all([
    listAccidents(db, projectId, start < yearStart ? start : yearStart, to),
    listFindings(db, projectId, from, to),
    listFindings(db, projectId, yearStart, to),
    sumReportManHours(db, projectId, from, to),
    sumReportManHours(db, projectId, start, to),
    listSafetyStatEntries(db, projectId, start, to),
    listSafetyStatYearOverrides(db, projectId, Number(to.slice(0, 4))),
    getSafetyBaseline(db, projectId),
  ]);
  const manualPeriod = manualEntries.filter((e) => e.entryDate >= from && e.entryDate <= to);
  const manualYear = manualEntries.filter((e) => e.entryDate >= yearStart);
  const manualField = {
    lti: "lti",
    non_lti: "nonLti",
    property_damage: "propertyDamage",
    near_miss: "nearMiss",
    emergency: "emergency",
  } as const;
  const manualCount = (rows: typeof manualEntries, code: AccidentCategory) =>
    rows.reduce((s, e) => s + e[manualField[code]], 0);
  const manualSum = (rows: typeof manualEntries, key: "inspections" | "manHours") =>
    rows.reduce((s, e) => s + e[key], 0);

  const inRange = (d: string, a: string, b: string) => d >= a && d <= b;
  const count = (cat: AccidentCategory, a: string, b: string) =>
    allAccidents.filter((x) => x.category === cat && inRange(x.reportDate, a, b)).length;
  const categories = ACCIDENT_CATEGORY_CODES.map((code) => ({
    code,
    period: count(code, from, to) + manualCount(manualPeriod, code),
    // EPS can write the paper form's "Year YYYY" column by hand; an override wins over the computed count.
    year: yearOverrides.get(code) ?? (count(code, yearStart, to) + manualCount(manualYear, code)),
  }));

  // Safety clock from injuries only (contractor reports + EPS manual entries). EPS can also write the
  // two STATISTIC rows by hand (daysWithoutAccident = the running clock as of that date, Excel-like);
  // a hand-written value anchors the clock from that day on, until the next injury resets it to 0.
  const injuryDates = [
    ...allAccidents.filter((a) => INJURY_CATEGORIES.includes(a.category as AccidentCategory)).map((a) => a.reportDate),
    ...manualEntries.filter((e) => e.lti > 0 || e.nonLti > 0).map((e) => e.entryDate),
    // The last LTI from before the app (EPS baseline) restarts the clock too, unless a later entry says otherwise.
    ...(baseline?.lastLtiDate && baseline.lastLtiDate <= to ? [baseline.lastLtiDate] : []),
  ];
  const injuries = [...new Set(injuryDates)].sort();
  type ClockEvent = { d: string; injury: boolean; value: number };
  const events: ClockEvent[] = [
    ...injuries.map((d) => ({ d, injury: true, value: 0 })),
    ...manualEntries
      .filter((e) => e.daysWithoutAccident != null)
      .map((e) => ({ d: e.entryDate, injury: false, value: e.daysWithoutAccident! })),
  ].sort((a, b) => a.d.localeCompare(b.d) || (a.injury ? -1 : 1));
  let run = 0;
  let runDate = start;
  let highest = 0;
  for (const ev of events) {
    highest = Math.max(highest, run + days(runDate, ev.d));
    if (ev.injury) run = 0;
    else {
      run = ev.value;
      highest = Math.max(highest, ev.value);
    }
    runDate = ev.d;
  }
  const daysWithoutAccident = run + days(runDate, to);
  highest = Math.max(highest, daysWithoutAccident);
  // Hand-written project record ("Highest Days Without Accident") never goes below the computed one.
  for (const e of manualEntries) {
    if (e.highestDaysWithoutAccident != null) highest = Math.max(highest, e.highestDaysWithoutAccident);
  }
  // The last LTI may be from before the app (EPS baseline); a later one reported here wins.
  const lastLti = [
    ...allAccidents.filter((a) => a.category === "lti").map((a) => a.reportDate),
    ...manualEntries.filter((e) => e.lti > 0).map((e) => e.entryDate),
    ...(baseline?.lastLtiDate && baseline.lastLtiDate <= to ? [baseline.lastLtiDate] : []),
  ].sort().at(-1) ?? null;

  const done = findingsInRange.filter((f) => f.status === "done").length;
  // EPS manual inspections are historical records; count them as completed line walks.
  const inspectionDone = done + manualSum(manualPeriod, "inspections");
  const inspectionTotal = findingsInRange.length + manualSum(manualPeriod, "inspections");
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
    nearMiss:
      allAccidents.filter((a) => a.category === "near_miss" && a.reportDate.startsWith(m)).length +
      manualYear.filter((e) => e.entryDate.startsWith(m)).reduce((s, e) => s + e.nearMiss, 0),
    inspections:
      findingsYear.filter((f) => f.inspectionDate.startsWith(m)).length +
      manualYear.filter((e) => e.entryDate.startsWith(m)).reduce((s, e) => s + e.inspections, 0),
  }));

  // Sparse daily series for the trend chart (daily / weekly views); the month view uses `monthly`.
  const dailyMap = new Map<string, { date: string; nearMiss: number; inspections: number }>();
  const dayRow = (date: string) => {
    let row = dailyMap.get(date);
    if (!row) {
      row = { date, nearMiss: 0, inspections: 0 };
      dailyMap.set(date, row);
    }
    return row;
  };
  for (const a of allAccidents) if (a.category === "near_miss" && a.reportDate >= yearStart) dayRow(a.reportDate).nearMiss += 1;
  for (const f of findingsYear) dayRow(f.inspectionDate).inspections += 1;
  for (const e of manualYear) {
    if (e.nearMiss) dayRow(e.entryDate).nearMiss += e.nearMiss;
    if (e.inspections) dayRow(e.entryDate).inspections += e.inspections;
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    from,
    to,
    yearStart,
    projectStart: start,
    tiles: {
      accidents: categories.filter((c) => INJURY_CATEGORIES.includes(c.code)).reduce((s, c) => s + c.period, 0),
      lti: categories.find((c) => c.code === "lti")!.period,
      nearMiss: categories.find((c) => c.code === "near_miss")!.period,
      inspections: inspectionTotal,
      closed: inspectionDone,
      closedPct: inspectionTotal ? Math.round((inspectionDone / inspectionTotal) * 100) : null,
    },
    categories,
    daysWithoutAccident,
    highestDaysWithoutAccident: highest,
    lastLti,
    manHoursPeriod: manHoursPeriod + manualSum(manualPeriod, "manHours"),
    // Total since the start of construction = hours worked before the app (EPS baseline) + everything since.
    manHoursTotal: manHoursTotal + manualSum(manualEntries, "manHours") + (baseline?.manHoursBefore ?? 0),
    baseline: { manHoursBefore: baseline?.manHoursBefore ?? 0, lastLtiDate: baseline?.lastLtiDate ?? null, projectStartDate: baseline?.projectStartDate ?? null },
    unsafeAct: typeSummary("unsafe_act"),
    unsafeCondition: typeSummary("unsafe_condition"),
    monthly,
    daily,
  };
}
