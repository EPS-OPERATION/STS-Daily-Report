import { getDb } from "@/db/client.js";
import { NotFoundError } from "@/shared/errors/app-error.js";
import { projects } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { listZones } from "./zone.repository.js";

export async function listZonesService(projectId: string, status?: string) {
  const found = await getDb().select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!found[0]) throw new NotFoundError("Project not found", { projectId });
  return listZones(getDb(), projectId, status ?? "active");
}
