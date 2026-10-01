import { getDb } from "@/db/client.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getFacilityService } from "./facility.service.js";
import {
  createFacilityPart,
  getFacilityPart,
  listFacilityParts,
  updateFacilityPart,
} from "./facility-part.repository.js";
import type { CreateFacilityPartInput, UpdateFacilityPartInput } from "./facility-part.type.js";
import type { FacilityStatusFilter } from "./facility.type.js";

function normalize(input: UpdateFacilityPartInput) {
  const result = { ...input };
  if (input.name !== undefined) {
    result.name = input.name.trim();
    if (!result.name) throw new ValidationError("Work Part name is required");
  }
  if (input.code !== undefined) {
    result.code = input.code.trim().toUpperCase();
    if (!result.code) throw new ValidationError("Work Part code is required");
  }
  return result;
}

export async function listFacilityPartsService(facilityId: string, status: FacilityStatusFilter = "active") {
  await getFacilityService(facilityId);
  return listFacilityParts(getDb(), facilityId, status);
}

export async function getFacilityPartService(id: string) {
  const part = await getFacilityPart(getDb(), id);
  if (!part?.facilityId) throw new NotFoundError("Facility Work Part not found", { id });
  return part;
}

export async function createFacilityPartService(facilityId: string, input: CreateFacilityPartInput) {
  const facility = await getFacilityService(facilityId);
  if (!facility.isActive) throw new ValidationError("Facility is inactive", { facilityId });
  return createFacilityPart(getDb(), facilityId, { ...input, ...normalize(input) });
}

export async function updateFacilityPartService(id: string, input: UpdateFacilityPartInput) {
  await getFacilityPartService(id);
  return updateFacilityPart(getDb(), id, normalize(input));
}

export async function archiveFacilityPartService(id: string) {
  return updateFacilityPartService(id, { isActive: false });
}
