import { isEpsStaff } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { deleteRainLog, insertRainLog, listRainLogs, updateRainLog } from "./rain-log.repository.js";

export interface RainLogInput {
  date: string;
  startTime: string;
  endTime: string;
  stoppageHours?: number;
  intensity?: "light" | "moderate" | "heavy" | "storm" | null;
  rainfallMm?: number | null;
  impactSummary?: string;
  delayClaimNote?: string | null;
}

// Rain & Delay Log: EPS records when rain actually stopped work (reads for any signed-in user).
function assertEps(auth: AuthContext) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can record rain stoppages");
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

function normalise(input: RainLogInput) {
  if (input.startTime >= input.endTime) throw new ValidationError("End time must be after start time");
  // Stoppage defaults to the rain window; EPS may enter less (e.g. work resumed under cover).
  const window = (minutes(input.endTime) - minutes(input.startTime)) / 60;
  const stoppageHours = Math.round((input.stoppageHours ?? window) * 10) / 10;
  if (stoppageHours < 0 || stoppageHours > 24) throw new ValidationError("Stoppage hours must be 0–24");
  return {
    logDate: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    stoppageHours,
    intensity: input.intensity ?? null,
    rainfallMm: input.rainfallMm ?? null,
    impactSummary: input.impactSummary?.trim() ?? "",
    delayClaimNote: input.delayClaimNote?.trim() || null,
  };
}

export async function listRainLogsService(projectId: string, from: string, to: string) {
  if (from > to) throw new ValidationError("from must be on or before to");
  const rows = await listRainLogs(getDb(), projectId, from, to);
  return rows.map((r) => ({ ...r, recordedBy: r.recordedByName ?? "EPS", createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
}

export async function createRainLogService(auth: AuthContext, projectId: string, input: RainLogInput) {
  assertEps(auth);
  const id = await insertRainLog(getDb(), { projectId, ...normalise(input), recordedBy: auth.user.id });
  return { id };
}

export async function updateRainLogService(auth: AuthContext, projectId: string, id: string, input: RainLogInput) {
  assertEps(auth);
  const updated = await updateRainLog(getDb(), projectId, id, normalise(input));
  if (!updated) throw new NotFoundError("Rain log not found", { id });
  return { id };
}

export async function deleteRainLogService(auth: AuthContext, projectId: string, id: string) {
  assertEps(auth);
  if (!(await deleteRainLog(getDb(), projectId, id))) throw new NotFoundError("Rain log not found", { id });
}
