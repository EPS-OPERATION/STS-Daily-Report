import { isEpsStaff } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { assertProject } from "@/modules/projects/project.guard.js";
import { assertRange } from "@/shared/date-range.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { findMachineryConflicts, findRoadConflicts } from "./daily-request.conflicts.js";
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
