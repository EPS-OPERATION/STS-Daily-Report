import { isDailySiteMarkerIconKey, isDailySiteMarkerView } from "@sts/shared";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client.js";
import { facilities } from "@/db/schema/index.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { parseNormalizedPoint } from "@/modules/site-plans/site-plan.geometry.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  createDailySiteMarker,
  getDailySiteMarker,
  getDailySiteMarkerDetail,
  getDailySiteMarkerView,
  getWritableContractorIds,
  isContractorAssignedToProject,
  listDailySiteMarkers,
  updateDailySiteMarker,
  withdrawDailySiteMarker,
} from "./daily-site-marker.repository.js";
import type {
  CreateDailySiteMarkerInput,
  DailySiteMarkerFilters,
  UpdateDailySiteMarkerInput,
} from "./daily-site-marker.type.js";

function validateWorkDate(value: string) {
  const date = new Date(value + "T00:00:00.000Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000") ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new ValidationError("Work date must be a valid calendar date");
}

async function requireProject(projectId: string) {
  const project = await getProjectById(getDb(), projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  return project;
}

async function requireTopView(projectId: string, viewId: string, forCreate = false) {
  const view = await getDailySiteMarkerView(getDb(), viewId);
  if (!view) throw new NotFoundError("Map View not found", { viewId });
  if (view.projectId !== projectId) throw new ValidationError("Map View does not belong to this Project");
  if (!isDailySiteMarkerView(view)) throw new ValidationError("Daily Site Markers are available on Top View only");
  if (forCreate && (!view.isActive || !view.mapIsActive)) throw new ValidationError("Top View is inactive");
  return view;
}

async function requireProjectFacility(projectId: string, facilityId: string | null | undefined) {
  if (!facilityId) return;
  const facility = (
    await getDb()
      .select({ id: facilities.id, projectId: facilities.projectId })
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1)
  )[0];
  if (!facility) throw new NotFoundError("Facility not found", { facilityId });
  if (facility.projectId !== projectId) throw new ValidationError("Facility does not belong to this Project");
}

async function requireWritableContractor(projectId: string, userId: string, contractorId: string) {
  if (!(await isContractorAssignedToProject(getDb(), projectId, contractorId)))
    throw new ValidationError("Contractor is not assigned to this Project", { contractorId, projectId });
  if (!(await getWritableContractorIds(getDb(), projectId, userId, [contractorId])).includes(contractorId))
    throw new ForbiddenError("You may only submit for a Contractor you belong to");
}

function markerDto(
  row: NonNullable<Awaited<ReturnType<typeof getDailySiteMarkerDetail>>>,
  userId: string,
  writable: Set<string>,
) {
  const canEdit = row.status === "active" && row.createdById === userId && writable.has(row.contractorId);
  return {
    id: row.id,
    projectId: row.projectId,
    siteMapViewId: row.siteMapViewId,
    workDate: row.workDate,
    contractor: row.contractor,
    createdBy: row.createdBy,
    updatedBy: row.updatedById ? row.updatedBy : null,
    iconKey: row.iconKey,
    comment: row.comment,
    x: row.x,
    y: row.y,
    facility: row.facilityId && row.facility?.id ? row.facility : null,
    status: row.status,
    withdrawnAt: row.withdrawnAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canEdit,
    canWithdraw: canEdit,
  };
}

async function writableIdsFor(userId: string, projectId: string, contractorIds: string[]) {
  return new Set(await getWritableContractorIds(getDb(), projectId, userId, contractorIds));
}

export async function listDailySiteMarkersService(projectId: string, filters: DailySiteMarkerFilters, userId: string) {
  await requireProject(projectId);
  validateWorkDate(filters.workDate);
  await requireTopView(projectId, filters.siteMapViewId);
  if (filters.contractorId && !(await isContractorAssignedToProject(getDb(), projectId, filters.contractorId)))
    throw new ValidationError("Contractor is not assigned to this Project", { contractorId: filters.contractorId });
  await requireProjectFacility(projectId, filters.facilityId);
  if (filters.iconKey && !isDailySiteMarkerIconKey(filters.iconKey))
    throw new ValidationError("Invalid Site Marker type");
  const rows = await listDailySiteMarkers(getDb(), projectId, filters);
  const writable = await writableIdsFor(userId, projectId, [...new Set(rows.map((row) => row.contractorId))]);
  return rows.map((row) => markerDto(row, userId, writable));
}

export async function createDailySiteMarkerService(
  projectId: string,
  userId: string,
  input: CreateDailySiteMarkerInput,
) {
  await requireProject(projectId);
  validateWorkDate(input.workDate);
  await requireTopView(projectId, input.siteMapViewId, true);
  await requireWritableContractor(projectId, userId, input.contractorId);
  await requireProjectFacility(projectId, input.facilityId);
  if (!isDailySiteMarkerIconKey(input.iconKey)) throw new ValidationError("Invalid Site Marker type");
  const comment = input.comment.trim();
  if (!comment || comment.length > 2000) throw new ValidationError("Comment must be between 1 and 2000 characters");
  const point = parseNormalizedPoint({ x: input.x, y: input.y });
  const row = await createDailySiteMarker(getDb(), projectId, userId, { ...input, ...point, comment });
  const detail = await getDailySiteMarkerDetail(getDb(), row.id);
  if (!detail) throw new NotFoundError("Daily Site Marker not found", { id: row.id });
  return markerDto(detail, userId, new Set([input.contractorId]));
}

async function requireEditableMarker(id: string, userId: string) {
  const marker = await getDailySiteMarker(getDb(), id);
  if (!marker) throw new NotFoundError("Daily Site Marker not found", { id });
  if (marker.status !== "active") throw new ConflictError("Withdrawn Site Markers cannot be changed");
  if (marker.createdBy !== userId) throw new ForbiddenError("Only the submitting user may change this Site Marker");
  await requireWritableContractor(marker.projectId, userId, marker.contractorId);
  return marker;
}

export async function updateDailySiteMarkerService(id: string, userId: string, input: UpdateDailySiteMarkerInput) {
  const current = await requireEditableMarker(id, userId);
  const patch = { ...input };
  if (patch.iconKey !== undefined && !isDailySiteMarkerIconKey(patch.iconKey))
    throw new ValidationError("Invalid Site Marker type");
  if (patch.comment !== undefined) {
    patch.comment = patch.comment.trim();
    if (!patch.comment || patch.comment.length > 2000)
      throw new ValidationError("Comment must be between 1 and 2000 characters");
  }
  if ((patch.x === undefined) !== (patch.y === undefined))
    throw new ValidationError("Both coordinates are required to move a Site Marker");
  if (patch.x !== undefined && patch.y !== undefined)
    Object.assign(patch, parseNormalizedPoint({ x: patch.x, y: patch.y }));
  if (patch.facilityId !== undefined) await requireProjectFacility(current.projectId, patch.facilityId);
  if (Object.keys(patch).length === 0) throw new ValidationError("No Site Marker changes supplied");
  await updateDailySiteMarker(getDb(), id, userId, patch);
  const updated = await getDailySiteMarkerDetail(getDb(), id);
  if (!updated) throw new NotFoundError("Daily Site Marker not found", { id });
  const writable = await writableIdsFor(userId, current.projectId, [current.contractorId]);
  return markerDto(updated, userId, writable);
}

export async function withdrawDailySiteMarkerService(id: string, userId: string) {
  const current = await requireEditableMarker(id, userId);
  await withdrawDailySiteMarker(getDb(), id, userId);
  const withdrawn = await getDailySiteMarkerDetail(getDb(), id);
  if (!withdrawn) throw new NotFoundError("Daily Site Marker not found", { id });
  return markerDto(withdrawn, userId, new Set([current.contractorId]));
}
