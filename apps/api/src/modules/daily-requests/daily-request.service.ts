import { isEpsStaff, type PermitType } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { assertProject } from "@/modules/projects/project.guard.js";
import { assertRange } from "@/shared/date-range.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getBuilding } from "@/modules/buildings/building.repository.js";
import { ensureReport } from "@/modules/daily-reports/daily-report.repository.js";
import { isContractorInProject } from "@/modules/site-activities/site-activity.repository.js";
import { findMachineryConflicts, findRoadConflicts } from "./daily-request.conflicts.js";
import { getPermitForProject, insertEpsPermitRow, updatePermitRow } from "./daily-request.repository.js";
import { getRoadUsageForProject, listBookingsInRange, listEquipmentRequestsInRange, listForecastsInRange, listPermitDetailsInRange, listRoadUsageInRange, setRoadAdjustment } from "./daily-request.repository.js";

// Daily Request page: everything requested for target dates in [from, to].
export async function dailyRequestsService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const [machinery, equipment, roads, permits, forecasts] = await Promise.all([
    listBookingsInRange(db, projectId, from, to),
    listEquipmentRequestsInRange(db, projectId, from, to),
    listRoadUsageInRange(db, projectId, from, to),
    listPermitDetailsInRange(db, projectId, from, to),
    listForecastsInRange(db, projectId, from, to),
  ]);
  const conflicts = findMachineryConflicts(machinery);
  const clash = new Map<string, "conflict" | "possible">();
  for (const c of conflicts) for (const id of c.bookingIds) if (clash.get(id) !== "conflict") clash.set(id, c.severity);
  const roadClash = new Set(findRoadConflicts(roads).flatMap((c) => c.ids));
  return {
    from,
    to,
    machinery: machinery.map((m) => ({ ...m, conflict: clash.get(m.id) ?? null })),
    equipmentRequests: equipment,
    roads: roads.map((r) => ({ ...r, conflict: roadClash.has(r.id) })),
    permits,
    forecasts,
  };
}

// ---- printable report ------------------------------------------------------

// EPS only: settle a road booking on another time. The request stays on the row; the adjusted window is what
// conflicts, lists and print use. Setting the request's own times again clears the change.
export async function adjustRoadUsageService(auth: AuthContext, projectId: string, id: string, input: { startTime: string; endTime: string }) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can change road usage times");
  await assertProject(projectId);
  if (input.startTime >= input.endTime) throw new ValidationError("End time must be after start time", { startTime: input.startTime });
  const db = getDb();
  const row = await getRoadUsageForProject(db, projectId, id);
  if (!row) throw new NotFoundError("Road usage booking not found", { id });
  const unchanged = input.startTime === row.requestedStartTime && input.endTime === row.requestedEndTime;
  await setRoadAdjustment(
    db,
    id,
    unchanged ? null : { startTime: input.startTime, endTime: input.endTime, byId: auth.user.id, at: new Date() },
  );
  const updated = await getRoadUsageForProject(db, projectId, id);
  if (!updated) throw new NotFoundError("Road usage booking not found", { id });
  return updated;
}

// EPS only: update work permit details. The edit is stamped, so a contractor re-sending the report keeps it.
export async function updatePermitService(
  auth: AuthContext,
  projectId: string,
  id: string,
  input: {
    targetDate?: string;
    buildingId?: string;
    permitType?: PermitType;
    otherLabel?: string | null;
    workers?: number;
    highRisk?: boolean;
    taskName?: string | null;
    supervisorName?: string | null;
  },
) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can edit work permits");
  await assertProject(projectId);
  const db = getDb();
  const existing = await getPermitForProject(db, projectId, id);
  if (!existing) throw new NotFoundError("Work permit not found", { id });

  const nextPermitType = (input.permitType ?? existing.permitType) as PermitType;
  const nextOtherLabel = input.otherLabel !== undefined ? input.otherLabel : existing.otherLabel;
  const nextWorkers = input.workers ?? existing.workers;
  const nextHighRisk = input.highRisk ?? existing.highRisk;
  const nextTaskName = input.taskName !== undefined ? input.taskName : existing.taskName;
  const nextSupervisorName = input.supervisorName !== undefined ? input.supervisorName : existing.supervisorName;

  if (nextWorkers <= 0) throw new ValidationError("Workers must be greater than 0");
  if (nextPermitType === "other" && !nextOtherLabel?.trim()) throw new ValidationError("Describe the permit when type is Other");
  if (nextHighRisk && (!nextTaskName?.trim() || !nextSupervisorName?.trim())) {
    throw new ValidationError("High-risk work needs a task name and an EPS supervisor", { permitType: nextPermitType });
  }
  if (input.buildingId && input.buildingId !== existing.buildingId) {
    const b = await getBuilding(db, input.buildingId);
    if (!b || b.projectId !== projectId) throw new ValidationError("Invalid building", { buildingId: input.buildingId });
  }

  await updatePermitRow(db, id, {
    targetDate: input.targetDate ?? existing.targetDate,
    buildingId: input.buildingId ?? existing.buildingId,
    permitType: nextPermitType,
    otherLabel: nextPermitType === "other" ? nextOtherLabel?.trim() || null : null,
    workers: nextWorkers,
    highRisk: nextHighRisk,
    taskName: nextTaskName?.trim() || null,
    supervisorName: nextSupervisorName?.trim() || null,
  });
  const updated = await getPermitForProject(db, projectId, id);
  if (!updated) throw new NotFoundError("Work permit not found", { id });
  return updated;
}

// EPS only: add a permit / high-risk task the contractor left out or got wrong. It goes on that
// contractor's report for the target date (a draft row is created when none exists yet).
export async function createPermitService(
  auth: AuthContext,
  projectId: string,
  input: {
    contractorId: string;
    targetDate: string;
    buildingId: string;
    permitType: PermitType;
    otherLabel?: string | null;
    workers: number;
    highRisk: boolean;
    taskName?: string | null;
    supervisorName?: string | null;
  },
) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can add work permits");
  await assertProject(projectId);
  const db = getDb();
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }
  const b = await getBuilding(db, input.buildingId);
  if (!b || b.projectId !== projectId) throw new ValidationError("Invalid building", { buildingId: input.buildingId });
  const otherLabel = input.permitType === "other" ? input.otherLabel?.trim() || null : null;
  if (input.permitType === "other" && !otherLabel) throw new ValidationError("Describe the permit when type is Other");
  const taskName = input.taskName?.trim() || null;
  const supervisorName = input.supervisorName?.trim() || null;
  if (input.highRisk && (!taskName || !supervisorName)) {
    throw new ValidationError("High-risk work needs a task name and an EPS supervisor", { permitType: input.permitType });
  }

  const report = await ensureReport(db, projectId, input.contractorId, input.targetDate);
  const id = await insertEpsPermitRow(db, {
    reportId: report.id,
    targetDate: input.targetDate,
    buildingId: input.buildingId,
    permitType: input.permitType,
    otherLabel,
    workers: input.workers,
    highRisk: input.highRisk,
    taskName,
    supervisorName,
  });
  const created = await getPermitForProject(db, projectId, id);
  if (!created) throw new NotFoundError("Work permit not found", { id });
  return created;
}
