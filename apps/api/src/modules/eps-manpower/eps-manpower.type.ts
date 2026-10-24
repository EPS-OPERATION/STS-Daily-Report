import type { PositionCode } from "@sts/shared";

export interface EpsManpowerPositionInput {
  position: PositionCode;
  headcount: number;
}

export interface EpsManpowerAllocationInput {
  buildingId: string;
  headcount: number;
  workDescription: string;
  startTime?: string;
  endTime?: string;
}

export interface EpsManpowerInput {
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  otHours?: number;
  positions: EpsManpowerPositionInput[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  allocations?: EpsManpowerAllocationInput[];
}

export interface EpsManpowerEntry {
  date: string;
  startTime: string | null;
  endTime: string | null;
  workHours: number | null;
  otHours: number | null;
  positions: EpsManpowerPositionInput[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  allocations: Array<EpsManpowerAllocationInput & { buildingCode: string; buildingName: string }>;
}
