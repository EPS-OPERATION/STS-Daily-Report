import { getProjectById } from "@/modules/projects/project.repository.js";
import { getZoneById } from "@/modules/zones/zone.repository.js";
import { getDb } from "@/db/client.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  createActivity,
  getActivityById,
  isContractorInProject,
  listActivities,
  updateActivity,
} from "./site-activity.repository.js";
import type {
  CreateSiteActivityInput,
  SiteActivityFilters,
  UpdateSiteActivityInput,
} from "./site-activity.type.js";

async function assertProjectContext(projectId: string, zoneId: string, contractorId: string) {
  const db = getDb();
  const project = await getProjectById(db, projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  const zone = await getZoneById(db, zoneId);
  if (!zone) throw new NotFoundError("Zone not found", { zoneId });
  if (zone.projectId !== projectId) {
    throw new ValidationError("Zone does not belong to this project", { zoneId, projectId });
  }
  const member = await isContractorInProject(db, projectId, contractorId);
  if (!member) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId, projectId });
  }
}

export async function listActivitiesService(projectId: string, filters: SiteActivityFilters) {
  const project = await getProjectById(getDb(), projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  return listActivities(getDb(), projectId, filters);
}

export async function createActivityService(
  projectId: string,
  input: CreateSiteActivityInput,
  createdBy: string | null,
) {
  await assertProjectContext(projectId, input.zoneId, input.contractorId);
  return createActivity(getDb(), projectId, input, createdBy);
}

export async function updateActivityService(id: string, input: UpdateSiteActivityInput) {
  const db = getDb();
  const current = await getActivityById(db, id);
  if (!current) throw new NotFoundError("Site activity not found", { id });
  const zoneId = input.zoneId ?? current.zoneId;
  const contractorId = input.contractorId ?? current.contractorId;
  await assertProjectContext(current.projectId, zoneId, contractorId);
  const updated = await updateActivity(db, id, input);
  if (!updated) throw new NotFoundError("Site activity not found", { id });
  return updated;
}
