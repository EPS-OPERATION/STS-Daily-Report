import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { listFacilityPlacements } from "@/modules/site-maps/site-map.repository.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { createFacility, getFacility, listFacilities, updateFacility } from "./facility.repository.js";
import type { CreateFacilityInput, FacilityStatusFilter, UpdateFacilityInput } from "./facility.type.js";

export async function listFacilitiesService(
  projectId: string,
  status: FacilityStatusFilter = "active",
  search?: string,
) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
  return listFacilities(getDb(), projectId, status, search);
}

export async function getFacilityService(id: string) {
  const facility = await getFacility(getDb(), id);
  if (!facility) throw new NotFoundError("Facility not found", { id });
  return facility;
}

export async function listFacilityPlacementsService(id: string) {
  const facility = await getFacilityService(id);
  return listFacilityPlacements(getDb(), facility.projectId, facility.id);
}

function normalize(input: UpdateFacilityInput) {
  const result = { ...input };
  if (input.name !== undefined) {
    result.name = input.name.trim();
    if (!result.name) throw new ValidationError("Facility name is required");
  }
  if (input.code !== undefined) result.code = input.code?.trim().toUpperCase() || null;
  return result;
}

export async function createFacilityService(projectId: string, input: CreateFacilityInput) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
  return createFacility(getDb(), projectId, { ...input, ...normalize(input) });
}

export async function updateFacilityService(id: string, input: UpdateFacilityInput) {
  await getFacilityService(id);
  return updateFacility(getDb(), id, normalize(input));
}

export async function archiveFacilityService(id: string) {
  return updateFacilityService(id, { isActive: false });
}
