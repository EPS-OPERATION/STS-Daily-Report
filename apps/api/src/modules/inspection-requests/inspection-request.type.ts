import type { InspectionResult, InspectionType, Readiness, RequestStatus } from "@sts/shared";

export interface RequestFields {
  buildingId: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectionType: InspectionType;
  workItem: string;
  location?: string;
  drawingRef?: string;
  readiness: Readiness;
}

export interface CreateRequestInput extends RequestFields {
  contractorId: string;
  reportDate: string;
}

export interface ListRequestsQuery {
  from: string;
  to: string;
  contractorId?: string;
  by?: "inspection" | "report";
}

export interface TransitionInput {
  to: RequestStatus;
  result?: InspectionResult;
  note?: string;
}
