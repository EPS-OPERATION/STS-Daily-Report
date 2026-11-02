import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { NotFoundError } from "@/shared/errors/app-error.js";

export async function assertProject(projectId: string) {
  const project = await getProjectById(getDb(), projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
}
