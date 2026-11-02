import type { InspectionResult, InspectionType, Readiness, RequestStatus } from "@sts/shared";

export interface InspectionRequest {
  id: string;
  projectId: string;
  contractorId: string;
  contractorCode: string;
  contractorName: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  reportDate: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectionType: InspectionType;
  workItem: string;
  location: string | null;
  drawingRef: string | null;
  readiness: Readiness;
  status: RequestStatus;
  result: InspectionResult | null;
  epsNote: string | null;
  statusChangedAt: string | null;
  createdAt: string;
}

export interface InspectionRequestFields {
  buildingId: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectionType: InspectionType;
  workItem: string;
  location?: string;
  drawingRef?: string;
  readiness: Readiness;
}

// ---- chart data (weekly meeting page) ----
