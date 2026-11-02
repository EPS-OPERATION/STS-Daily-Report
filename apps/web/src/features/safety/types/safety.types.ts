import type { AccidentCategory, FindingStatus, FindingType } from "@sts/shared";

export interface SafetyFinding {
  id: string;
  /** Permanent running number of the project (internal ID). */
  itemNo: number;
  /** Monday of the ISO week of the inspection date. */
  weekStart: string;
  /** Number shown on the weekly report: restarts at 1 every ISO week. */
  weekNo: number;
  observation: string;
  buildingId: string | null;
  buildingCode: string | null;
  buildingName: string | null;
  locationDetail: string | null;
  actionToBeTaken: string;
  contractorId: string | null;
  contractorCode: string | null;
  contractorName: string | null;
  inspectionDate: string;
  expectedCompleteDate: string | null;
  status: FindingStatus;
  findingType: FindingType;
  closedAt: string | null;
  findingPhotoUrl: string | null;
  closePhotoUrl: string | null;
}

export interface FindingInput {
  observation: string;
  buildingId: string | null;
  locationDetail?: string;
  actionToBeTaken: string;
  contractorId: string | null;
  inspectionDate: string;
  expectedCompleteDate: string | null;
  status: FindingStatus;
  findingType: FindingType;
}

interface TypeSummary {
  total: number;
  open: number;
  byContractor: { contractorCode: string; cases: number }[];
}

/** What happened on the project before the app was used: hours worked, last Loss Time Injury. */
export interface SafetyBaseline {
  manHoursBefore: number;
  lastLtiDate: string | null;
  /** Optional: EPS may not know it. Where the safety clock and the "Start –" label begin. */
  projectStartDate: string | null;
}
/** The record plus what the app has counted up to `asOf` (GET /safety/baseline). */
export interface SafetyBaselineInfo extends SafetyBaseline {
  asOf: string;
  countedHours: number;
  totalHours: number;
  confirmedName: string | null;
  updatedAt: string | null;
}
export interface SafetyBaselineInput {
  /** The whole project's man-hours up to and including `asOf`; the server splits off what the app has counted. */
  totalManHours?: { value: number; asOf: string };
  lastLtiDate?: string | null;
  projectStartDate?: string | null;
  confirmedName?: string | null;
}
export interface SafetyBaselineVersion {
  version: number;
  snapshot: { projectStartDate: string | null; lastLtiDate: string | null; manHoursBefore: number; enteredTotal?: { value: number; asOf: string } };
  contentHash: string;
  confirmedName: string | null;
  account: string | null;
  accountName: string | null;
  createdAt: string;
}

export interface SafetyStats {
  from: string;
  to: string;
  yearStart: string;
  projectStart: string;
  tiles: { accidents: number; lti: number; nearMiss: number; inspections: number; closed: number; closedPct: number | null };
  categories: { code: AccidentCategory; period: number; year: number }[];
  daysWithoutAccident: number;
  highestDaysWithoutAccident: number;
  lastLti: string | null;
  manHoursPeriod: number;
  manHoursTotal: number;
  /** Safety history from before the app (EPS): included in manHoursTotal / lastLti. */
  baseline: SafetyBaseline;
  unsafeAct: TypeSummary;
  unsafeCondition: TypeSummary;
  monthly: { month: string; nearMiss: number; inspections: number }[];
  daily: { date: string; nearMiss: number; inspections: number }[];
}

export interface SafetyStatEntry {
  id: string;
  projectId: string;
  entryDate: string;
  nearMiss: number;
  inspections: number;
  lti: number;
  nonLti: number;
  propertyDamage: number;
  emergency: number;
  manHours: number;
  /** Hand-written safety clock as of entryDate (paper STATISTIC rows); null = automatic. */
  daysWithoutAccident: number | null;
  highestDaysWithoutAccident: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyStatInput {
  date: string;
  nearMiss: number;
  inspections: number;
  lti: number;
  nonLti: number;
  propertyDamage: number;
  emergency: number;
  manHours: number;
  daysWithoutAccident?: number | null;
  highestDaysWithoutAccident?: number | null;
  /** Hand-written "Year YYYY" totals (paper STATISTIC column) — only the categories that changed. */
  yearValues?: { code: AccidentCategory; value: number }[];
  note: string | null;
  /** Typed by the person who confirms the save; kept in the append-only edit history. */
  confirmedName?: string | null;
}

// One saved version of an EPS stat entry (append-only; newest shown first in the UI).
export interface SafetyStatVersion {
  version: number;
  action: "create" | "edit";
  contentHash: string;
  confirmedName: string | null;
  account: string | null;
  accountName: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
