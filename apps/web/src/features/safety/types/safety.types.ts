import type { AccidentCategory, FindingStatus, FindingType } from "@sts/shared";

export interface SafetyFinding {
  id: string;
  itemNo: number;
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
  unsafeAct: TypeSummary;
  unsafeCondition: TypeSummary;
  monthly: { month: string; nearMiss: number; inspections: number }[];
}
