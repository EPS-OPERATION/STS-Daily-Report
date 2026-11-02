import { randomUUID } from "node:crypto";
import { isEpsStaff } from "@sts/shared";
import { getDb } from "@/db/client.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ForbiddenError, NotFoundError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import { deleteDroneLog, getDroneLog, insertDroneLog, listDroneLogs } from "./drone.repository.js";

export interface DroneUploadInput {
  date: string;
  title: string;
  description?: string;
  capturedBy?: string;
  /** Comma-separated tags from the multipart form. */
  tags?: string;
  file: File;
}

async function assertProject(projectId: string) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
}

function assertEps(auth: AuthContext) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can manage drone logs");
}

const parseTags = (raw?: string) =>
  (raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

export async function listDroneLogsService(projectId: string, from?: string, to?: string) {
  await assertProject(projectId);
  const rows = await listDroneLogs(getDb(), projectId, from, to);
  const storage = getStorage();
  return Promise.all(
    rows.map(async ({ objectKey, ...r }) => ({
      ...r,
      imageUrl: await storage.getPresignedUrl(objectKey, 3600).catch(() => null),
    })),
  );
}

export async function uploadDroneLogService(auth: AuthContext, projectId: string, input: DroneUploadInput) {
  assertEps(auth);
  await assertProject(projectId);
  const ext = (input.file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `drone/${projectId}/${input.date}/${randomUUID()}.${ext}`;
  await getStorage().upload({
    key,
    body: new Uint8Array(await input.file.arrayBuffer()),
    contentType: input.file.type,
  });
  const row = await insertDroneLog(getDb(), {
    projectId,
    logDate: input.date,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    capturedBy: input.capturedBy?.trim() ?? "",
    tags: parseTags(input.tags),
    objectKey: key,
    fileName: input.file.name.slice(0, 200),
    contentType: input.file.type,
    sizeBytes: input.file.size,
    createdBy: auth.user.id,
  });
  const { objectKey: _key, ...rest } = row;
  return rest;
}

export async function deleteDroneLogService(auth: AuthContext, id: string) {
  assertEps(auth);
  const row = await getDroneLog(getDb(), id);
  if (!row) throw new NotFoundError("Drone log not found", { id });
  await deleteDroneLog(getDb(), id);
  // Orphaned bytes are harmless; a failed remove must not resurrect the row.
  await getStorage()
    .remove(row.objectKey)
    .catch(() => undefined);
}
