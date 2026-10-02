import { and, asc, desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { normalizePagination } from "@sts/shared";
import {
  contractors,
  contractorMemberships,
  facilities,
  projectContractors,
  siteActivities,
  zoneParts,
  zones,
} from "@/db/schema/index.js";
import type { DbExecutor } from "@/db/client.js";
import type { CreateSiteActivityInput, SiteActivityFilters, UpdateSiteActivityInput } from "./site-activity.type.js";

const facilityPart = alias(zoneParts, "activity_facility_part");
function activityConditions(projectId: string, f: SiteActivityFilters) {
  const conditions = [eq(siteActivities.projectId, projectId)];
  const date = f.workDate ?? f.date;
  if (date) conditions.push(eq(siteActivities.workDate, date));
  if (f.facilityId) conditions.push(eq(siteActivities.facilityId, f.facilityId));
  if (f.facilityPartId) conditions.push(eq(siteActivities.facilityPartId, f.facilityPartId));
  if (f.zoneId) conditions.push(eq(siteActivities.zoneId, f.zoneId));
  if (f.before) conditions.push(lt(siteActivities.workDate, f.before));
  if (f.contractorId) conditions.push(eq(siteActivities.contractorId, f.contractorId));
  if (f.status) conditions.push(eq(siteActivities.status, f.status));
  return conditions;
}

function activityQuery(db: DbExecutor) {
  return db
    .select({
      id: siteActivities.id,
      projectId: siteActivities.projectId,
      workDate: siteActivities.workDate,
      title: siteActivities.title,
      description: siteActivities.description,
      status: siteActivities.status,
      manpower: siteActivities.manpower,
      progressPercent: siteActivities.progressPercent,
      startTime: siteActivities.startTime,
      endTime: siteActivities.endTime,
      createdAt: siteActivities.createdAt,
      facility: {
        id: facilities.id,
        key: facilities.key,
        name: facilities.name,
        code: facilities.code,
        isActive: facilities.isActive,
      },
      facilityPart: {
        id: facilityPart.id,
        facilityId: facilityPart.facilityId,
        code: facilityPart.code,
        name: facilityPart.name,
        isActive: facilityPart.isActive,
      },
      zone: { id: zones.id, code: zones.code, name: zones.name },
      zonePart: {
        id: zoneParts.id,
        code: zoneParts.code,
        name: zoneParts.name,
        displayColor: zoneParts.displayColor,
        isActive: zoneParts.isActive,
      },
      contractor: { id: contractors.id, code: contractors.code, name: contractors.name },
    })
    .from(siteActivities)
    .leftJoin(facilities, eq(siteActivities.facilityId, facilities.id))
    .leftJoin(facilityPart, eq(siteActivities.facilityPartId, facilityPart.id))
    .leftJoin(zones, eq(siteActivities.zoneId, zones.id))
    .leftJoin(zoneParts, eq(siteActivities.zonePartId, zoneParts.id))
    .innerJoin(contractors, eq(siteActivities.contractorId, contractors.id));
}

export async function listActivities(db: DbExecutor, projectId: string, f: SiteActivityFilters) {
  const conditions = activityConditions(projectId, f);
  const { page, pageSize } = normalizePagination({ page: f.page, pageSize: f.pageSize ?? 100 });
  const isRecentQuery = !!f.before && !f.workDate && !f.date;
  const statusPriority = desc(
    sql`CASE ${siteActivities.status} WHEN 'blocked' THEN 4 WHEN 'attention' THEN 3 WHEN 'active' THEN 2 WHEN 'completed' THEN 1 ELSE 0 END`,
  );
  const [rows, counts] = await Promise.all([
    activityQuery(db)
      .where(and(...conditions))
      .orderBy(
        ...(isRecentQuery
          ? [desc(siteActivities.workDate), desc(siteActivities.createdAt), asc(siteActivities.id)]
          : [
              statusPriority,
              desc(siteActivities.workDate),
              asc(sql`coalesce(${siteActivities.startTime}, '99:99')`),
              asc(siteActivities.createdAt),
              asc(siteActivities.id),
            ]),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(siteActivities)
      .where(and(...conditions)),
  ]);
  return { rows, total: counts[0]?.total ?? 0, page, pageSize };
}

export function listFacilitySummaries(db: DbExecutor, projectId: string, filters: SiteActivityFilters) {
  const conditions = [...activityConditions(projectId, filters), isNotNull(siteActivities.facilityId)];
  return db
    .select({
      facilityId: siteActivities.facilityId,
      activityCount: sql<number>`count(*)::int`,
      contractorCount: sql<number>`count(DISTINCT ${siteActivities.contractorId})::int`,
      manpowerCount: sql<number>`coalesce(sum(${siteActivities.manpower}), 0)::int`,
      highestPriorityStatus: sql<string>`CASE max(CASE ${siteActivities.status} WHEN 'blocked' THEN 4 WHEN 'attention' THEN 3 WHEN 'active' THEN 2 WHEN 'completed' THEN 1 ELSE 0 END) WHEN 4 THEN 'blocked' WHEN 3 THEN 'attention' WHEN 2 THEN 'active' WHEN 1 THEN 'completed' ELSE 'idle' END`,
    })
    .from(siteActivities)
    .where(and(...conditions))
    .groupBy(siteActivities.facilityId)
    .orderBy(asc(siteActivities.facilityId));
}

export async function getActivityDetail(db: DbExecutor, id: string) {
  return (await activityQuery(db).where(eq(siteActivities.id, id)).limit(1))[0] ?? null;
}

export async function getActivityById(db: DbExecutor, id: string) {
  return (await db.select().from(siteActivities).where(eq(siteActivities.id, id)).limit(1))[0] ?? null;
}

export async function isContractorInProject(db: DbExecutor, projectId: string, contractorId: string) {
  return (
    (
      await db
        .select({ contractorId: projectContractors.contractorId })
        .from(projectContractors)
        .where(and(eq(projectContractors.projectId, projectId), eq(projectContractors.contractorId, contractorId)))
        .limit(1)
    ).length > 0
  );
}

export async function hasActiveContractorMembership(db: DbExecutor, userId: string, contractorId: string) {
  return (
    (
      await db
        .select({ userId: contractorMemberships.userId })
        .from(contractorMemberships)
        .where(
          and(
            eq(contractorMemberships.userId, userId),
            eq(contractorMemberships.contractorId, contractorId),
            eq(contractorMemberships.status, "active"),
          ),
        )
        .limit(1)
    ).length > 0
  );
}

export async function createActivity(
  db: DbExecutor,
  projectId: string,
  input: CreateSiteActivityInput,
  createdBy: string | null,
) {
  return (
    await db
      .insert(siteActivities)
      .values({
        projectId,
        facilityId: input.facilityId ?? null,
        facilityPartId: input.facilityPartId ?? null,
        zoneId: input.zoneId ?? null,
        zonePartId: input.zonePartId ?? null,
        contractorId: input.contractorId,
        workDate: input.workDate,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status ?? "active",
        manpower: input.manpower ?? 0,
        progressPercent: input.progressPercent ?? 0,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        createdBy,
      })
      .returning()
  )[0]!;
}

export async function updateActivity(db: DbExecutor, id: string, input: UpdateSiteActivityInput) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of [
    "facilityId",
    "facilityPartId",
    "zoneId",
    "zonePartId",
    "contractorId",
    "workDate",
    "status",
    "manpower",
    "progressPercent",
    "startTime",
    "endTime",
  ] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  if (input.title !== undefined) patch["title"] = input.title.trim();
  if (input.description !== undefined) patch["description"] = input.description?.trim() || null;
  return (await db.update(siteActivities).set(patch).where(eq(siteActivities.id, id)).returning())[0] ?? null;
}
