import { and, asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import type { DbExecutor } from "@/db/client.js";
import { facilities, facilityMapMarkers, projects, siteMapViews, sitePlans } from "@/db/schema/index.js";
import { facilityFields } from "@/modules/facilities/facility.repository.js";
import type {
  CreateSiteMapInput,
  MapStatusFilter,
  MarkerDraftInput,
  UpdateMapViewInput,
  UpdateSiteMapInput,
} from "./site-map.type.js";

const mapFields = {
  id: sitePlans.id,
  projectId: sitePlans.projectId,
  name: sitePlans.name,
  description: sitePlans.description,
  isDefault: sitePlans.isDefault,
  isActive: sitePlans.isActive,
  createdAt: sitePlans.createdAt,
  updatedAt: sitePlans.updatedAt,
};

export async function lockMapProject(db: DbExecutor, projectId: string) {
  return (
    (await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).for("update"))[0] ?? null
  );
}

export function listSiteMaps(db: DbExecutor, projectId: string, status: MapStatusFilter = "active") {
  const conditions = [eq(sitePlans.projectId, projectId)];
  if (status !== "all") conditions.push(eq(sitePlans.isActive, status === "active"));
  return db
    .select(mapFields)
    .from(sitePlans)
    .where(and(...conditions))
    .orderBy(desc(sitePlans.isDefault), asc(sitePlans.name), asc(sitePlans.id));
}

export async function getSiteMap(db: DbExecutor, id: string) {
  return (await db.select(mapFields).from(sitePlans).where(eq(sitePlans.id, id)).limit(1))[0] ?? null;
}

export async function clearDefaultMaps(db: DbExecutor, projectId: string) {
  await db
    .update(sitePlans)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(and(eq(sitePlans.projectId, projectId), eq(sitePlans.isDefault, true)));
}

export async function createSiteMap(db: DbExecutor, projectId: string, input: CreateSiteMapInput) {
  return (
    await db
      .insert(sitePlans)
      .values({ ...input, projectId })
      .returning(mapFields)
  )[0]!;
}

export async function updateSiteMap(db: DbExecutor, id: string, input: UpdateSiteMapInput) {
  return (
    (
      await db
        .update(sitePlans)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(sitePlans.id, id))
        .returning(mapFields)
    )[0] ?? null
  );
}

export function listMapViews(db: DbExecutor, siteMapId: string, status: MapStatusFilter = "active") {
  const conditions = [eq(siteMapViews.sitePlanId, siteMapId)];
  if (status !== "all") conditions.push(eq(siteMapViews.isActive, status === "active"));
  return db
    .select()
    .from(siteMapViews)
    .where(and(...conditions))
    .orderBy(asc(siteMapViews.sortOrder), asc(siteMapViews.id));
}

export async function getMapViewRecord(db: DbExecutor, id: string) {
  return (
    (
      await db
        .select({ ...getTableColumns(siteMapViews), projectId: sitePlans.projectId })
        .from(siteMapViews)
        .innerJoin(sitePlans, eq(siteMapViews.sitePlanId, sitePlans.id))
        .where(eq(siteMapViews.id, id))
        .limit(1)
    )[0] ?? null
  );
}

export async function createMapView(
  db: DbExecutor,
  siteMapId: string,
  input: { key: string; name: string; sortOrder: number; isActive?: boolean },
) {
  return (
    await db
      .insert(siteMapViews)
      .values({ ...input, sitePlanId: siteMapId })
      .returning()
  )[0]!;
}

export async function updateMapView(
  db: DbExecutor,
  id: string,
  input: UpdateMapViewInput & { imageObjectKey?: string; legacyAssetUrl?: null; width?: number; height?: number },
) {
  return (
    (
      await db
        .update(siteMapViews)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(siteMapViews.id, id))
        .returning()
    )[0] ?? null
  );
}

export function listFacilityMarkers(db: DbExecutor, viewId: string, includeInactive = false) {
  const conditions = [eq(facilityMapMarkers.siteMapViewId, viewId)];
  if (!includeInactive) conditions.push(eq(facilities.isActive, true));
  return db
    .select({
      ...getTableColumns(facilityMapMarkers),
      facility: facilityFields,
    })
    .from(facilityMapMarkers)
    .innerJoin(facilities, eq(facilityMapMarkers.facilityId, facilities.id))
    .where(and(...conditions))
    .orderBy(asc(facilities.sortOrder), asc(facilities.id));
}

export async function saveFacilityMarkers(db: DbExecutor, viewId: string, rows: MarkerDraftInput[]) {
  for (const row of rows) {
    if (row.x === null || row.y === null) {
      await db
        .delete(facilityMapMarkers)
        .where(and(eq(facilityMapMarkers.siteMapViewId, viewId), eq(facilityMapMarkers.facilityId, row.facilityId)));
    } else {
      await db
        .insert(facilityMapMarkers)
        .values({ siteMapViewId: viewId, facilityId: row.facilityId, x: row.x, y: row.y })
        .onConflictDoUpdate({
          target: [facilityMapMarkers.facilityId, facilityMapMarkers.siteMapViewId],
          set: { x: row.x, y: row.y, updatedAt: new Date() },
        });
    }
  }
}

export function listFacilityPlacements(db: DbExecutor, projectId: string, facilityId: string) {
  return db
    .select({
      siteMapId: sitePlans.id,
      mapName: sitePlans.name,
      siteMapViewId: siteMapViews.id,
      viewName: siteMapViews.name,
      isActive: sql<boolean>`${siteMapViews.isActive} AND ${sitePlans.isActive}`,
      markerId: facilityMapMarkers.id,
      x: facilityMapMarkers.x,
      y: facilityMapMarkers.y,
    })
    .from(siteMapViews)
    .innerJoin(sitePlans, eq(siteMapViews.sitePlanId, sitePlans.id))
    .leftJoin(
      facilityMapMarkers,
      and(eq(facilityMapMarkers.siteMapViewId, siteMapViews.id), eq(facilityMapMarkers.facilityId, facilityId)),
    )
    .where(eq(sitePlans.projectId, projectId))
    .orderBy(asc(sitePlans.name), asc(siteMapViews.sortOrder), asc(siteMapViews.id));
}
