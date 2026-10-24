import type { PositionCode } from "@sts/shared";

export interface EpsManpowerPosition {
  position: PositionCode;
  headcount: number;
}

export interface EpsManpowerAllocation {
  buildingId: string;
  buildingCode?: string;
  buildingName?: string;
  headcount: number;
  workDescription: string;
  startTime?: string;
  endTime?: string;
}

export interface EpsManpowerEntry {
  date: string;
  startTime: string | null;
  endTime: string | null;
  workHours: number | null;
  otHours: number | null;
  positions: EpsManpowerPosition[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  allocations: EpsManpowerAllocation[];
}

export interface EpsManpowerPayload {
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  otHours?: number;
  positions: EpsManpowerPosition[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  allocations: Array<{
    buildingId: string;
    headcount: number;
    workDescription: string;
    startTime?: string;
    endTime?: string;
  }>;
}

export interface EpsManpowerResponse {
  data: {
    contractor: { id: string; code: string; name: string };
    entry: EpsManpowerEntry | null;
  };
}
