import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { NotFoundError } from "@/shared/errors/app-error.js";
import { listBuildings } from "./building.repository.js";

export async function listBuildingsService(projectId: string) {
  const db = getDb();
  const project = await getProjectById(db, projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  return listBuildings(db, projectId);
}
