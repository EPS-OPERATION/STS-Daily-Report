import { getProjectById } from "@/modules/projects/project.repository.js";
import { getZoneById } from "@/modules/zones/zone.repository.js";
import { getZonePartById } from "@/modules/zone-parts/zone-part.repository.js";
import { getFacilityRecord, getFacilitiesForLegacyZone } from "@/modules/facilities/facility.repository.js";
import { getFacilityPartRecord } from "@/modules/facilities/facility-part.repository.js";
import { getDb } from "@/db/client.js";
import type { SiteActivity } from "@/db/schema/index.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  createActivity,
  getActivityById,
  getActivityDetail,
  hasActiveContractorMembership,
  isContractorInProject,
  listActivities,
  listFacilitySummaries,
  updateActivity,
} from "./site-activity.repository.js";
import type { CreateSiteActivityInput, SiteActivityFilters, UpdateSiteActivityInput } from "./site-activity.type.js";

export function getZonePartAssignmentError(
  part: { zoneId: string | null; isActive: boolean } | null,
  selectedZoneId: string,
  projectId: string,
  zoneProjectId: string,
): "missing" | "inactive" | "wrong-zone" | "wrong-project" | null {
  if (!part) return "missing";
  if (zoneProjectId !== projectId) return "wrong-project";
  if (!part.isActive) return "inactive";
  if (part.zoneId !== selectedZoneId) return "wrong-zone";
  return null;
}

export function getFacilityPartAssignmentError(
  part: { facilityId: string | null; isActive: boolean } | null,
  facilityId: string,
): "missing" | "inactive" | "wrong-facility" | null {
  if (!part) return "missing";
  if (!part.isActive) return "inactive";
  return part.facilityId === facilityId ? null : "wrong-facility";
}

function validateWorkDate(date: string) {
  const parsed = new Date(date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date.slice(0, 4) === "0000" ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new ValidationError("Work date must be a valid calendar date");
  }
}

async function assertContractor(projectId: string, contractorId: string) {
  if (!(await isContractorInProject(getDb(), projectId, contractorId)))
    throw new ValidationError("Contractor is not assigned to this Project", { contractorId, projectId });
}

export interface ActivityActor {
  userId: string | null;
  isAdmin: boolean;
}

async function assertContractorWritable(actor: ActivityActor, projectId: string, contractorId: string) {
  await assertContractor(projectId, contractorId);
  if (actor.isAdmin) return;
  if (!actor.userId || !(await hasActiveContractorMembership(getDb(), actor.userId, contractorId)))
    throw new ForbiddenError("You are not permitted to submit Activity for this Contractor");
}

async function assertLegacyContext(projectId: string, zoneId: string, contractorId: string, zonePartId: string | null) {
  const zone = await getZoneById(getDb(), zoneId);
  if (!zone || zone.projectId !== projectId)
    throw new ValidationError("Legacy location does not belong to this Project");
  if (zonePartId) {
    const error = getZonePartAssignmentError(
      await getZonePartById(getDb(), zonePartId),
      zoneId,
      projectId,
      zone.projectId,
    );
    if (error) throw new ValidationError("Legacy Work Part assignment is invalid", { reason: error });
  }
  await assertContractor(projectId, contractorId);
}

async function resolveLocation(projectId: string, input: UpdateSiteActivityInput, current?: SiteActivity) {
  const db = getDb();
  let facilityId = input.facilityId;
  let zoneId = input.zoneId;
  if (!facilityId && !zoneId) {
    facilityId = current?.facilityId ?? undefined;
    if (!facilityId) zoneId = current?.zoneId;
  }
  let facility;
  if (facilityId) {
    facility = await getFacilityRecord(db, facilityId);
    if (!facility) throw new NotFoundError("Facility not found", { facilityId });
  } else if (zoneId) {
    const zone = await getZoneById(db, zoneId);
    if (!zone || zone.projectId !== projectId)
      throw new ValidationError("Legacy location does not belong to this Project");
    const matches = await getFacilitiesForLegacyZone(db, projectId, zoneId);
    if (matches.length !== 1) throw new ValidationError("Legacy location does not resolve to exactly one Facility");
    facility = matches[0]!;
  } else {
    throw new ValidationError("Choose a Facility");
  }
  if (facility.projectId !== projectId) throw new ValidationError("Facility does not belong to this Project");
  if (!facility.isActive) throw new ValidationError("Facility is inactive", { facilityId: facility.id });
  if (zoneId && facility.legacyZoneId !== zoneId)
    throw new ValidationError("Facility conflicts with the supplied legacy location");
  if (
    input.facilityPartId !== undefined &&
    input.zonePartId !== undefined &&
    input.facilityPartId !== input.zonePartId
  ) {
    throw new ValidationError("Facility Part conflicts with the supplied legacy Part");
  }
  const sameFacility =
    current &&
    (current.facilityId === facility.id ||
      (!current.facilityId && facility.legacyZoneId !== null && current.zoneId === facility.legacyZoneId));
  const partId =
    input.facilityPartId !== undefined
      ? input.facilityPartId
      : input.zonePartId !== undefined
        ? input.zonePartId
        : sameFacility
          ? (current.facilityPartId ?? current.zonePartId)
          : null;
  const part = partId ? await getFacilityPartRecord(db, partId) : null;
  if (partId) {
    const error = getFacilityPartAssignmentError(part, facility.id);
    if (error === "missing") throw new NotFoundError("Work Part not found", { partId });
    if (error === "inactive") throw new ValidationError("Work Part is inactive", { partId });
    if (error === "wrong-facility")
      throw new ValidationError("Work Part does not belong to this Facility", { partId, facilityId: facility.id });
  }
  return {
    facilityId: facility.id,
    facilityPartId: part?.id ?? null,
    zoneId: facility.legacyZoneId,
    zonePartId: part?.zoneId && part.zoneId === facility.legacyZoneId ? part.id : null,
  };
}

async function validateFilters(projectId: string, filters: SiteActivityFilters) {
  const db = getDb();
  if (!(await getProjectById(db, projectId))) throw new NotFoundError("Project not found", { projectId });
  if (filters.date && filters.workDate && filters.date !== filters.workDate)
    throw new ValidationError("Conflicting work date filters");
  const date = filters.workDate ?? filters.date;
  if (date) validateWorkDate(date);
  if (filters.before) validateWorkDate(filters.before);
  if (filters.page !== undefined && (!Number.isInteger(filters.page) || filters.page < 1))
    throw new ValidationError("Invalid page");
  if (
    filters.pageSize !== undefined &&
    (!Number.isInteger(filters.pageSize) || filters.pageSize < 1 || filters.pageSize > 100)
  )
    throw new ValidationError("Invalid page size");
  const facility = filters.facilityId ? await getFacilityRecord(db, filters.facilityId) : null;
  if (filters.facilityId && !facility) throw new NotFoundError("Facility not found");
  if (facility && facility.projectId !== projectId)
    throw new ValidationError("Facility does not belong to this Project");
  if (facility && filters.zoneId && facility.legacyZoneId !== filters.zoneId)
    throw new ValidationError("Conflicting Facility and legacy location filters");
  if (filters.facilityPartId) {
    const part = await getFacilityPartRecord(db, filters.facilityPartId);
    if (!part?.facilityId) throw new NotFoundError("Facility Work Part not found");
    const owner = await getFacilityRecord(db, part.facilityId);
    if (!owner || owner.projectId !== projectId || (facility && facility.id !== owner.id))
      throw new ValidationError("Work Part does not belong to the selected Facility / Project");
  }
}

export async function listActivitiesService(projectId: string, filters: SiteActivityFilters) {
  await validateFilters(projectId, filters);
  return listActivities(getDb(), projectId, filters);
}

export async function listFacilitySummariesService(projectId: string, filters: SiteActivityFilters) {
  await validateFilters(projectId, filters);
  if (!filters.workDate && !filters.date) throw new ValidationError("Work date is required for Facility summaries");
  return listFacilitySummaries(getDb(), projectId, filters);
}

export async function getActivityService(id: string) {
  const activity = await getActivityDetail(getDb(), id);
  if (!activity) throw new NotFoundError("Activity not found", { id });
  return activity;
}

export async function createActivityService(projectId: string, input: CreateSiteActivityInput, actor: ActivityActor) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
  validateWorkDate(input.workDate);
  if (!input.title.trim()) throw new ValidationError("Activity title is required");
  const location = await resolveLocation(projectId, input);
  await assertContractorWritable(actor, projectId, input.contractorId);
  const row = await createActivity(getDb(), projectId, { ...input, ...location }, actor.userId);
  return getActivityService(row.id);
}

export async function updateActivityService(id: string, input: UpdateSiteActivityInput, actor: ActivityActor) {
  const db = getDb();
  const current = await getActivityById(db, id);
  if (!current) throw new NotFoundError("Activity not found", { id });
  if (input.workDate !== undefined) validateWorkDate(input.workDate);
  if (input.title !== undefined && !input.title.trim()) throw new ValidationError("Activity title is required");
  const contractorId = input.contractorId ?? current.contractorId;
  const hasLocationInput = [input.facilityId, input.zoneId, input.facilityPartId, input.zonePartId].some(
    (value) => value !== undefined,
  );
  if (!current.facilityId && !hasLocationInput && current.zoneId) {
    // Preserve unresolved historical rows when changing non-location fields; never guess a Facility.
    await assertLegacyContext(current.projectId, current.zoneId, contractorId, current.zonePartId);
    await assertContractorWritable(actor, current.projectId, contractorId);
    await updateActivity(db, id, input);
  } else {
    const location = await resolveLocation(current.projectId, input, current);
    await assertContractorWritable(actor, current.projectId, contractorId);
    await updateActivity(db, id, { ...input, ...location });
  }
  return getActivityService(id);
}
