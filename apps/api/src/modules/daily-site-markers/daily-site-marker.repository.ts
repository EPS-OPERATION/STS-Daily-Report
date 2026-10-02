import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  contractorMemberships,
  contractors,
  dailySiteMarkers,
  facilities,
  projectContractors,
  siteMapViews,
  sitePlans,
  users,
} from "@/db/schema/index.js";
import type { DbExecutor } from "@/db/client.js";
import type {
  CreateDailySiteMarkerInput,
  DailySiteMarkerFilters,
  UpdateDailySiteMarkerInput,
} from "./daily-site-marker.type.js";

const createdByUser = alias(users, "daily_marker_creator");
const updatedByUser = alias(users, "daily_marker_editor");

function markerQuery(db: DbExecutor) {
  return db
    .select({
      id: dailySiteMarkers.id,
      projectId: dailySiteMarkers.projectId,
      siteMapViewId: dailySiteMarkers.siteMapViewId,
      workDate: dailySiteMarkers.workDate,
      contractorId: dailySiteMarkers.contractorId,
      createdById: dailySiteMarkers.createdBy,
      updatedById: dailySiteMarkers.updatedBy,
      iconKey: dailySiteMarkers.iconKey,
      comment: dailySiteMarkers.comment,
      x: dailySiteMarkers.x,
      y: dailySiteMarkers.y,
      facilityId: dailySiteMarkers.facilityId,
      status: dailySiteMarkers.status,
      withdrawnAt: dailySiteMarkers.withdrawnAt,
      createdAt: dailySiteMarkers.createdAt,
      updatedAt: dailySiteMarkers.updatedAt,
      contractor: { id: contractors.id, code: contractors.code, name: contractors.name },
      createdBy: { id: createdByUser.id, displayName: createdByUser.displayName },
      updatedBy: { id: updatedByUser.id, displayName: updatedByUser.displayName },
      facility: { id: facilities.id, name: facilities.name, code: facilities.code },
    })
    .from(dailySiteMarkers)
    .innerJoin(contractors, eq(dailySiteMarkers.contractorId, contractors.id))
    .innerJoin(createdByUser, eq(dailySiteMarkers.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(dailySiteMarkers.updatedBy, updatedByUser.id))
    .leftJoin(facilities, eq(dailySiteMarkers.facilityId, facilities.id));
}

export async function getDailySiteMarkerView(db: DbExecutor, viewId: string) {
  return (
    (
      await db
        .select({
          id: siteMapViews.id,
          key: siteMapViews.key,
          isActive: siteMapViews.isActive,
          sitePlanId: sitePlans.id,
          projectId: sitePlans.projectId,
          mapIsActive: sitePlans.isActive,
        })
        .from(siteMapViews)
        .innerJoin(sitePlans, eq(siteMapViews.sitePlanId, sitePlans.id))
        .where(eq(siteMapViews.id, viewId))
        .limit(1)
    )[0] ?? null
  );
}

export async function isContractorAssignedToProject(db: DbExecutor, projectId: string, contractorId: string) {
  return (
    (
      await db
        .select({ id: projectContractors.contractorId })
        .from(projectContractors)
        .where(and(eq(projectContractors.projectId, projectId), eq(projectContractors.contractorId, contractorId)))
        .limit(1)
    ).length > 0
  );
}

export async function getWritableContractorIds(
  db: DbExecutor,
  projectId: string,
  userId: string,
  contractorIds: string[],
) {
  if (contractorIds.length === 0) return [];
  const rows = await db
    .select({ id: projectContractors.contractorId })
    .from(projectContractors)
    .innerJoin(
      contractorMemberships,
      and(
        eq(contractorMemberships.contractorId, projectContractors.contractorId),
        eq(contractorMemberships.userId, userId),
        eq(contractorMemberships.status, "active"),
      ),
    )
    .where(and(eq(projectContractors.projectId, projectId), inArray(projectContractors.contractorId, contractorIds)));
  return rows.map((row) => row.id);
}

export async function listDailySiteMarkers(db: DbExecutor, projectId: string, filters: DailySiteMarkerFilters) {
  const conditions = [
    eq(dailySiteMarkers.projectId, projectId),
    eq(dailySiteMarkers.siteMapViewId, filters.siteMapViewId),
    eq(dailySiteMarkers.workDate, filters.workDate),
  ];
  if (filters.status && filters.status !== "all") conditions.push(eq(dailySiteMarkers.status, filters.status));
  else if (!filters.status) conditions.push(eq(dailySiteMarkers.status, "active"));
  if (filters.contractorId) conditions.push(eq(dailySiteMarkers.contractorId, filters.contractorId));
  if (filters.facilityId) conditions.push(eq(dailySiteMarkers.facilityId, filters.facilityId));
  if (filters.iconKey) conditions.push(eq(dailySiteMarkers.iconKey, filters.iconKey));
  return markerQuery(db)
    .where(and(...conditions))
    .orderBy(desc(dailySiteMarkers.createdAt), asc(dailySiteMarkers.id));
}

export async function getDailySiteMarker(db: DbExecutor, id: string) {
  return (await db.select().from(dailySiteMarkers).where(eq(dailySiteMarkers.id, id)).limit(1))[0] ?? null;
}

export async function getDailySiteMarkerDetail(db: DbExecutor, id: string) {
  return (await markerQuery(db).where(eq(dailySiteMarkers.id, id)).limit(1))[0] ?? null;
}

export async function createDailySiteMarker(
  db: DbExecutor,
  projectId: string,
  userId: string,
  input: CreateDailySiteMarkerInput,
) {
  return (
    await db
      .insert(dailySiteMarkers)
      .values({
        projectId,
        siteMapViewId: input.siteMapViewId,
        workDate: input.workDate,
        contractorId: input.contractorId,
        createdBy: userId,
        iconKey: input.iconKey,
        comment: input.comment,
        x: input.x,
        y: input.y,
        facilityId: input.facilityId ?? null,
      })
      .returning()
  )[0]!;
}

export async function updateDailySiteMarker(
  db: DbExecutor,
  id: string,
  userId: string,
  patch: UpdateDailySiteMarkerInput & { facilityId?: string | null },
) {
  return (
    (
      await db
        .update(dailySiteMarkers)
        .set({
          ...patch,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(dailySiteMarkers.id, id))
        .returning()
    )[0] ?? null
  );
}

export async function withdrawDailySiteMarker(db: DbExecutor, id: string, userId: string) {
  const now = new Date();
  return (
    (
      await db
        .update(dailySiteMarkers)
        .set({
          status: "withdrawn",
          withdrawnAt: now,
          updatedBy: userId,
          updatedAt: now,
        })
        .where(eq(dailySiteMarkers.id, id))
        .returning()
    )[0] ?? null
  );
}
