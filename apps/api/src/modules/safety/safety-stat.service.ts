import { isEpsStaff } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { canonicalJson, contentHash, type SaveMeta } from "@/shared/integrity.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  deleteSafetyStatEntry,
  getSafetyStatEntry,
  getSafetyBaseline,
  getSafetyStatEntryById,
  listSafetyStatEntries,
  saveSafetyStatYearOverrides,
  upsertSafetyBaseline,
  upsertSafetyStatEntry,
  type SafetyStatEntryInput,
} from "./safety-stat.repository.js";
import { insertSafetyBaselineVersion, insertSafetyStatVersion, listSafetyBaselineVersions, listSafetyStatVersions } from "./safety-stat-version.repository.js";
import { sumReportManHours } from "@/modules/report-summaries/index.js";
const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

function assertEps(auth: AuthContext) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can record safety statistics");
}

async function assertProject(projectId: string) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
}

function assertRange(from: string, to: string) {
  const d = days(from, to);
  if (!(d >= 0 && d <= 400)) throw new ValidationError("Date range must be 0–400 days", { from, to });
}

function validDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ValidationError("Invalid date", { date });
  }
}

function validateInput(input: SafetyStatEntryInput) {
  validDate(input.date);
  const values = [
    input.nearMiss,
    input.inspections,
    input.lti,
    input.nonLti,
    input.propertyDamage,
    input.emergency,
  ];
  if (values.some((n) => !Number.isInteger(n) || n < 0)) throw new ValidationError("Counts must be whole numbers ≥ 0");
  if (!Number.isFinite(input.manHours) || input.manHours < 0) throw new ValidationError("Man-hours must be ≥ 0");
  for (const key of ["daysWithoutAccident", "highestDaysWithoutAccident"] as const) {
    const n = input[key];
    if (n != null && (!Number.isInteger(n) || n < 0)) throw new ValidationError("Days without accident must be a whole number ≥ 0", { [key]: n });
  }
}

export async function listSafetyStatEntriesService(auth: AuthContext, projectId: string, from: string, to: string) {
  assertEps(auth);
  await assertProject(projectId);
  assertRange(from, to);
  return listSafetyStatEntries(getDb(), projectId, from, to);
}

export async function getSafetyStatEntryService(auth: AuthContext, projectId: string, date: string) {
  assertEps(auth);
  await assertProject(projectId);
  validDate(date);
  return getSafetyStatEntry(getDb(), projectId, date);
}

export async function saveSafetyStatEntryService(
  auth: AuthContext,
  projectId: string,
  input: SafetyStatEntryInput & {
    confirmedName?: string | null;
    yearValues?: { code: string; value: number }[];
  },
  meta?: SaveMeta,
) {
  assertEps(auth);
  await assertProject(projectId);
  validateInput(input);
  const yearValues = input.yearValues ?? [];
  if (yearValues.some((v) => !Number.isInteger(v.value) || v.value < 0)) {
    throw new ValidationError("Year totals must be whole numbers ≥ 0");
  }
  const existing = await getSafetyStatEntry(getDb(), projectId, input.date);
  const id = await upsertSafetyStatEntry(getDb(), projectId, input, auth.user.id);
  const confirmedName = input.confirmedName?.trim().slice(0, 120) || null;
  // Hand-written "Year YYYY" totals replace the computed year count for the categories EPS saved.
  if (yearValues.length) {
    await saveSafetyStatYearOverrides(getDb(), projectId, Number(input.date.slice(0, 4)), yearValues, auth.user.id, confirmedName);
  }
  // Append-only edit history (Electronic Transactions Act rule, same as daily reports): keep what was
  // confirmed, by whom (typed name — accounts may be shared), when, and from where.
  const saved = await getSafetyStatEntry(getDb(), projectId, input.date);
  const snapshot = {
    date: input.date,
    nearMiss: saved!.nearMiss,
    inspections: saved!.inspections,
    lti: saved!.lti,
    nonLti: saved!.nonLti,
    propertyDamage: saved!.propertyDamage,
    emergency: saved!.emergency,
    manHours: saved!.manHours,
    daysWithoutAccident: saved!.daysWithoutAccident,
    highestDaysWithoutAccident: saved!.highestDaysWithoutAccident,
    yearValues,
    note: saved!.note,
  };
  const version = await insertSafetyStatVersion(getDb(), {
    entryId: id,
    action: existing ? "edit" : "create",
    snapshot: JSON.parse(canonicalJson(snapshot)) as unknown,
    contentHash: contentHash(snapshot),
    confirmedName,
    userId: auth.user.id,
    ip: meta?.ip ?? null,
    userAgent: meta?.userAgent?.slice(0, 300) ?? null,
  });
  return { id, entry: saved, version };
}

export async function listSafetyStatVersionsService(auth: AuthContext, projectId: string, entryId: string) {
  assertEps(auth);
  await assertProject(projectId);
  const entry = await getSafetyStatEntryById(getDb(), projectId, entryId);
  if (!entry) throw new NotFoundError("Safety statistic entry not found", { entryId });
  return listSafetyStatVersions(getDb(), entryId);
}

export async function deleteSafetyStatEntryService(auth: AuthContext, projectId: string, entryId: string) {
  assertEps(auth);
  await assertProject(projectId);
  const row = await getSafetyStatEntryById(getDb(), projectId, entryId);
  if (!row) throw new NotFoundError("Safety statistic entry not found", { entryId });
  await deleteSafetyStatEntry(getDb(), projectId, entryId);
}

// ---- the project's safety history before the app ----------------------------------------------------------------
// EPS does not know the exact figures from the first day, so they are kept as ONE small record and everything else
// keeps flowing in from the reports: Total hours = hours before the app + hours counted from reports and EPS entries;
// Last LTI = the later of the old date and any LTI reported since; the clock restarts from either.
const EARLIEST = "2000-01-01";

// Hours the app itself has counted up to and including `asOf` (contractor reports + EPS daily entries).
async function countedHours(projectId: string, asOf: string) {
  const db = getDb();
  const [fromReports, entries] = await Promise.all([sumReportManHours(db, projectId, EARLIEST, asOf), listSafetyStatEntries(db, projectId, EARLIEST, asOf)]);
  return Math.round((fromReports + entries.reduce((s, e) => s + e.manHours, 0)) * 10) / 10;
}

const baselineDto = (row: Awaited<ReturnType<typeof getSafetyBaseline>>) => ({
  projectStartDate: row?.projectStartDate ?? null,
  lastLtiDate: row?.lastLtiDate ?? null,
  manHoursBefore: row?.manHoursBefore ?? 0,
  confirmedName: row?.confirmedName ?? null,
  updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
});

// The record plus what the app has counted up to `asOf`, so the form can show "total = before + counted".
export async function getSafetyBaselineService(auth: AuthContext, projectId: string, asOf: string) {
  assertEps(auth);
  await assertProject(projectId);
  validDate(asOf);
  const base = baselineDto(await getSafetyBaseline(getDb(), projectId));
  const counted = await countedHours(projectId, asOf);
  return { ...base, asOf, countedHours: counted, totalHours: Math.round((base.manHoursBefore + counted) * 10) / 10 };
}

export async function saveSafetyBaselineService(
  auth: AuthContext,
  projectId: string,
  input: {
    /** Total man-hours of the whole project up to and including `asOf` (the number EPS can estimate). */
    totalManHours?: { value: number; asOf: string };
    lastLtiDate?: string | null;
    projectStartDate?: string | null;
    confirmedName?: string | null;
  },
  meta?: SaveMeta,
) {
  assertEps(auth);
  await assertProject(projectId);
  for (const d of [input.lastLtiDate, input.projectStartDate]) if (d) validDate(d);
  const db = getDb();
  const current = await getSafetyBaseline(db, projectId);
  let manHoursBefore = current?.manHoursBefore ?? 0;
  if (input.totalManHours) {
    const { value, asOf } = input.totalManHours;
    validDate(asOf);
    if (!(Number.isFinite(value) && value >= 0)) throw new ValidationError("Total man-hours must be 0 or more");
    const counted = await countedHours(projectId, asOf);
    // The total includes what the app has already counted; only the rest is "before the app".
    if (value < counted) throw new ValidationError(`The app has already counted ${counted.toLocaleString("en-US")} man-hours up to ${asOf}, so the total cannot be lower`, { counted });
    manHoursBefore = Math.round((value - counted) * 10) / 10;
  }
  const confirmedName = input.confirmedName?.trim().slice(0, 120) || null;
  const row = await upsertSafetyBaseline(db, projectId, {
    manHoursBefore,
    lastLtiDate: input.lastLtiDate !== undefined ? input.lastLtiDate : (current?.lastLtiDate ?? null),
    projectStartDate: input.projectStartDate !== undefined ? input.projectStartDate : (current?.projectStartDate ?? null),
  }, auth.user.id, confirmedName);
  // Append-only history, same as the daily entries: what was confirmed, by whom, when, from where.
  const snapshot = {
    projectStartDate: row.projectStartDate,
    lastLtiDate: row.lastLtiDate,
    manHoursBefore: row.manHoursBefore,
    ...(input.totalManHours ? { enteredTotal: input.totalManHours } : {}),
  };
  const version = await insertSafetyBaselineVersion(db, {
    projectId,
    snapshot: JSON.parse(canonicalJson(snapshot)) as unknown,
    contentHash: contentHash(snapshot),
    confirmedName,
    userId: auth.user.id,
    ip: meta?.ip ?? null,
    userAgent: meta?.userAgent?.slice(0, 300) ?? null,
  });
  return { ...baselineDto(row), version: version.version };
}

export async function listSafetyBaselineVersionsService(auth: AuthContext, projectId: string) {
  assertEps(auth);
  await assertProject(projectId);
  return listSafetyBaselineVersions(getDb(), projectId);
}
