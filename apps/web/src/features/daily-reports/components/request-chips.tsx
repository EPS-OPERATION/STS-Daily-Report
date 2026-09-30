import { READINESS, type InspectionResult, type Readiness, type RequestStatus } from "@sts/shared";
import { StatusChip } from "@/components/ui/status-chip.js";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "Draft",
  requested: "Requested",
  confirmed: "Confirmed",
  inspected: "Inspected",
  closed: "Closed",
};

// Kanban status mapped onto the shared StatusChip tones (icon + label, never colour alone).
export function RequestStatusChip({ status, result }: { status: RequestStatus; result?: InspectionResult | null }) {
  if (status === "inspected" || status === "closed") {
    if (result === "fail") return <StatusChip status="rejected" label={`${REQUEST_STATUS_LABEL[status]} · Fail`} />;
    return <StatusChip status="approved" label={`${REQUEST_STATUS_LABEL[status]}${result ? " · Pass" : ""}`} />;
  }
  const tone = status === "draft" ? "draft" : status === "requested" ? "submitted" : "reviewed";
  return <StatusChip status={tone} label={REQUEST_STATUS_LABEL[status]} />;
}

export function ReadinessChip({ readiness }: { readiness: Readiness }) {
  const meta = READINESS.find((r) => r.code === readiness);
  const tone = readiness === "ready" ? "active" : readiness === "preparing" ? "attention" : "blocked";
  return <StatusChip status={tone} label={meta?.labelTh ?? readiness} />;
}
