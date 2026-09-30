import { REQUEST_TRANSITIONS, type RequestStatus } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { getReportByKey } from "@/modules/daily-reports/daily-report.repository.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { isContractorInProject } from "@/modules/site-activities/site-activity.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  deleteRequest,
  getRequest,
  insertRequest,
  listRequests,
  updateRequest,
} from "./inspection-request.repository.js";
import type { CreateRequestInput, ListRequestsQuery, RequestFields, TransitionInput } from "./inspection-request.type.js";

const MAX_LEAD_DAYS = 7;
const CONTRACTOR_EDITABLE: RequestStatus[] = ["draft", "requested"];

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

async function memberContractorIds(auth: AuthContext) {
  return (await listActiveContractorsForUser(getDb(), auth.user.id)).map((c) => c.id);
}

async function assertMember(auth: AuthContext, contractorId: string) {
  if (!(await memberContractorIds(auth)).includes(contractorId)) {
    throw new ForbiddenError("You are not a member of this contractor", { contractorId });
  }
}

async function validateFields(projectId: string, reportDate: string, f: RequestFields) {
  const buildings = await listBuildings(getDb(), projectId);
  if (!buildings.some((b) => b.id === f.buildingId)) throw new ValidationError("Unknown building", { buildingId: f.buildingId });
  const lead = daysBetween(reportDate, f.inspectionDate);
  if (lead < 0 || lead > MAX_LEAD_DAYS) {
    throw new ValidationError(`Inspection date must be within ${MAX_LEAD_DAYS} days of the report date`, {
      reportDate,
      inspectionDate: f.inspectionDate,
    });
  }
}

function clean(f: RequestFields) {
  return {
    buildingId: f.buildingId,
    inspectionDate: f.inspectionDate,
    inspectionTime: f.inspectionTime,
    inspectionType: f.inspectionType,
    workItem: f.workItem.trim(),
    location: f.location?.trim() || null,
    drawingRef: f.drawingRef?.trim() || null,
    readiness: f.readiness,
  };
}

// EPS sees every contractor; a contractor user sees only their own companies.
export async function listRequestsService(auth: AuthContext, projectId: string, q: ListRequestsQuery) {
  const project = await getProjectById(getDb(), projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  if (daysBetween(q.from, q.to) < 0 || daysBetween(q.from, q.to) > 62) {
    throw new ValidationError("Date range must be 0–62 days", { from: q.from, to: q.to });
  }
  let contractorIds: string[] | undefined;
  if (auth.user.role !== "eps") {
    const mine = await memberContractorIds(auth);
    contractorIds = q.contractorId ? mine.filter((id) => id === q.contractorId) : mine;
    if (contractorIds.length === 0) return [];
  } else if (q.contractorId) {
    contractorIds = [q.contractorId];
  }
  return listRequests(getDb(), projectId, { from: q.from, to: q.to, by: q.by ?? "inspection", contractorIds });
}

export async function createRequestService(auth: AuthContext, projectId: string, input: CreateRequestInput) {
  const db = getDb();
  await assertMember(auth, input.contractorId);
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }
  await validateFields(projectId, input.reportDate, input);
  // Requests are planned in the evening for the next day: draft until that evening
  // report is sent, then straight to QAQC.
  const report = await getReportByKey(db, projectId, input.contractorId, input.reportDate);
  const status: RequestStatus = report?.eveningStatus === "submitted" ? "requested" : "draft";
  const id = await insertRequest(db, {
    projectId,
    contractorId: input.contractorId,
    reportDate: input.reportDate,
    ...clean(input),
    status,
    createdBy: auth.user.id,
    statusChangedAt: status === "requested" ? new Date() : null,
    statusChangedBy: status === "requested" ? auth.user.id : null,
  });
  return (await getRequest(db, id))!;
}

async function loadEditable(auth: AuthContext, requestId: string) {
  const row = await getRequest(getDb(), requestId);
  if (!row) throw new NotFoundError("Request not found", { requestId });
  await assertMember(auth, row.contractorId);
  if (!CONTRACTOR_EDITABLE.includes(row.status as RequestStatus)) {
    throw new ConflictError("QAQC has already confirmed this request — ask EPS to change it", { status: row.status });
  }
  return row;
}

export async function updateRequestService(auth: AuthContext, requestId: string, input: RequestFields) {
  const row = await loadEditable(auth, requestId);
  await validateFields(row.projectId, row.reportDate, input);
  await updateRequest(getDb(), requestId, clean(input));
  return (await getRequest(getDb(), requestId))!;
}

export async function deleteRequestService(auth: AuthContext, requestId: string) {
  await loadEditable(auth, requestId);
  await deleteRequest(getDb(), requestId);
}

// EPS-only kanban move. Inspected requires a pass/fail result (feeds first-pass rate).
export async function transitionRequestService(auth: AuthContext, requestId: string, input: TransitionInput) {
  if (auth.user.role !== "eps") throw new ForbiddenError("Only EPS staff can change request status");
  const row = await getRequest(getDb(), requestId);
  if (!row) throw new NotFoundError("Request not found", { requestId });
  const from = row.status as RequestStatus;
  if (!REQUEST_TRANSITIONS[from].includes(input.to)) {
    throw new ConflictError(`Cannot move a request from ${from} to ${input.to}`, { from, to: input.to });
  }
  if (input.to === "inspected" && !input.result) {
    throw new ValidationError("Record the inspection result (pass/fail)");
  }
  await updateRequest(getDb(), requestId, {
    status: input.to,
    result: input.to === "inspected" ? input.result : input.to === "requested" ? null : row.result,
    epsNote: input.note?.trim() || row.epsNote,
    statusChangedAt: new Date(),
    statusChangedBy: auth.user.id,
  });
  return (await getRequest(getDb(), requestId))!;
}
