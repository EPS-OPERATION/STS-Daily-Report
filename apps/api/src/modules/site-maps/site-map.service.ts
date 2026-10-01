import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { getFacilityRecordsByIds } from "@/modules/facilities/facility.repository.js";
import { parseNormalizedPoint } from "@/modules/site-plans/site-plan.geometry.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import {
  clearDefaultMaps,
  createMapView,
  createSiteMap,
  getMapViewRecord,
  getSiteMap,
  listFacilityMarkers,
  listMapViews,
  listSiteMaps,
  lockMapProject,
  saveFacilityMarkers,
  updateMapView,
  updateSiteMap,
} from "./site-map.repository.js";
import type {
  CreateMapViewInput,
  CreateSiteMapInput,
  MapStatusFilter,
  MarkerDraftInput,
  UpdateMapViewInput,
  UpdateSiteMapInput,
} from "./site-map.type.js";
import type { siteMapViews } from "@/db/schema/index.js";

function requiredName(name: string) {
  const value = name.trim();
  if (!value) throw new ValidationError("Name is required");
  return value;
}

export async function listSiteMapsService(projectId: string, status: MapStatusFilter = "active") {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
  return listSiteMaps(getDb(), projectId, status);
}

export async function getSiteMapService(id: string) {
  const map = await getSiteMap(getDb(), id);
  if (!map) throw new NotFoundError("Site Map not found", { id });
  return map;
}

export async function createSiteMapService(projectId: string, input: CreateSiteMapInput) {
  if (input.isDefault && input.isActive === false) throw new ValidationError("An inactive Map cannot be default");
  const name = requiredName(input.name);
  return getDb().transaction(async (tx) => {
    if (!(await lockMapProject(tx, projectId))) throw new NotFoundError("Project not found", { projectId });
    const maps = await listSiteMaps(tx, projectId);
    const isDefault = input.isActive === false ? false : (input.isDefault ?? !maps.some((map) => map.isDefault));
    if (isDefault) await clearDefaultMaps(tx, projectId);
    return createSiteMap(tx, projectId, { ...input, name, description: input.description?.trim() || null, isDefault });
  });
}

export async function updateSiteMapService(id: string, input: UpdateSiteMapInput) {
  if (input.isDefault && input.isActive === false) throw new ValidationError("An inactive Map cannot be default");
  const current = await getSiteMapService(id);
  const patch = { ...input };
  if (input.name !== undefined) patch.name = requiredName(input.name);
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.isActive === false) patch.isDefault = false;
  if (patch.isDefault && !(patch.isActive ?? current.isActive))
    throw new ValidationError("An inactive Map cannot be default");
  return getDb().transaction(async (tx) => {
    await lockMapProject(tx, current.projectId);
    if (patch.isDefault) await clearDefaultMaps(tx, current.projectId);
    return updateSiteMap(tx, id, patch);
  });
}

export async function mapViewDto(view: typeof siteMapViews.$inferSelect) {
  return {
    id: view.id,
    siteMapId: view.sitePlanId,
    key: view.key,
    name: view.name,
    imageUrl: view.imageObjectKey ? await getStorage().getPresignedUrl(view.imageObjectKey, 900) : view.legacyAssetUrl,
    width: view.width,
    height: view.height,
    sortOrder: view.sortOrder,
    isActive: view.isActive,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

export async function listMapViewsService(mapId: string, status: MapStatusFilter = "active") {
  await getSiteMapService(mapId);
  return Promise.all((await listMapViews(getDb(), mapId, status)).map(mapViewDto));
}

export async function requireMapView(id: string) {
  const view = await getMapViewRecord(getDb(), id);
  if (!view) throw new NotFoundError("Map View not found", { id });
  return view;
}

export async function getMapViewService(id: string) {
  return mapViewDto(await requireMapView(id));
}

export async function createMapViewService(mapId: string, input: CreateMapViewInput) {
  await getSiteMapService(mapId);
  const name = requiredName(input.name);
  const key =
    input.key ??
    (name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
      "view-" + crypto.randomUUID());
  const views = await listMapViews(getDb(), mapId, "all");
  const sortOrder = input.sortOrder ?? (views.length ? Math.max(...views.map((view) => view.sortOrder)) + 1 : 0);
  return mapViewDto(await createMapView(getDb(), mapId, { name, key, sortOrder, isActive: input.isActive }));
}

export async function updateMapViewService(id: string, input: UpdateMapViewInput) {
  await requireMapView(id);
  const patch = { ...input };
  if (input.name !== undefined) patch.name = requiredName(input.name);
  return mapViewDto((await updateMapView(getDb(), id, patch))!);
}

export async function listFacilityMarkersService(viewId: string, includeInactive = false) {
  await requireMapView(viewId);
  return listFacilityMarkers(getDb(), viewId, includeInactive);
}

export async function saveFacilityMarkersService(viewId: string, inputs: MarkerDraftInput[]) {
  const view = await requireMapView(viewId);
  const records = await getFacilityRecordsByIds(
    getDb(),
    inputs.map((row) => row.facilityId),
  );
  const byId = new Map(records.map((facility) => [facility.id, facility]));
  const seen = new Set<string>();
  const rows = inputs.map((input) => {
    if (seen.has(input.facilityId))
      throw new ValidationError("Facility appears more than once in marker drafts", { facilityId: input.facilityId });
    seen.add(input.facilityId);
    const facility = byId.get(input.facilityId);
    if (!facility) throw new NotFoundError("Facility not found", { facilityId: input.facilityId });
    if (facility.projectId !== view.projectId)
      throw new ValidationError("Facility and Map View must belong to the same Project");
    if (input.x === null && input.y === null) return { facilityId: input.facilityId, x: null, y: null };
    if (!facility.isActive) throw new ValidationError("Facility is inactive", { facilityId: input.facilityId });
    const point = parseNormalizedPoint({ x: input.x, y: input.y });
    return { facilityId: input.facilityId, ...point };
  });
  await getDb().transaction((tx) => saveFacilityMarkers(tx, viewId, rows));
  return listFacilityMarkers(getDb(), viewId, true);
}
