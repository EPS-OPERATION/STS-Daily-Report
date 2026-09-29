import { and, asc, eq, sql } from "drizzle-orm";
import { contractors, projectContractors, siteActivities, zones } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";
import type {
  CreateSiteActivityInput,
  SiteActivityFilters,
  UpdateSiteActivityInput,
} from "./site-activity.type.js";

export async function listActivities(db: Db, projectId: string, f: SiteActivityFilters) {
  const conditions = [eq(siteActivities.projectId, projectId)];
  if (f.date) conditions.push(eq(siteActivities.workDate, f.date));
  if (f.zoneId) conditions.push(eq(siteActivities.zoneId, f.zoneId));
  if (f.contractorId) conditions.push(eq(siteActivities.contractorId, f.contractorId));
  if (f.status) conditions.push(eq(siteActivities.status, f.status));

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
      zone: { id: zones.id, code: zones.code, name: zones.name },
      contractor: { id: contractors.id, code: contractors.code, name: contractors.name },
    })
    .from(siteActivities)
    .innerJoin(zones, eq(siteActivities.zoneId, zones.id))
    .innerJoin(contractors, eq(siteActivities.contractorId, contractors.id))
    .where(and(...conditions))
    .orderBy(asc(zones.sortOrder), asc(zones.code), asc(siteActivities.title))
    .limit(500);
}

export async function getActivityById(db: Db, id: string) {
  const rows = await db.select().from(siteActivities).where(eq(siteActivities.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function isContractorInProject(db: Db, projectId: string, contractorId: string) {
  const rows = await db
    .select({ contractorId: projectContractors.contractorId })
    .from(projectContractors)
    .where(
      and(
        eq(projectContractors.projectId, projectId),
        eq(projectContractors.contractorId, contractorId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function createActivity(
  db: Db,
  projectId: string,
  input: CreateSiteActivityInput,
  createdBy: string | null,
) {
  const rows = await db
    .insert(siteActivities)
    .values({
      projectId,
      zoneId: input.zoneId,
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
    .returning();
  return rows[0]!;
}

export async function updateActivity(db: Db, id: string, input: UpdateSiteActivityInput) {
  const patch: Record<string, unknown> = { updatedAt: sql`now()` };
  if (input.zoneId !== undefined) patch["zoneId"] = input.zoneId;
  if (input.contractorId !== undefined) patch["contractorId"] = input.contractorId;
  if (input.workDate !== undefined) patch["workDate"] = input.workDate;
  if (input.title !== undefined) patch["title"] = input.title.trim();
  if (input.description !== undefined) patch["description"] = input.description?.trim() || null;
  if (input.status !== undefined) patch["status"] = input.status;
  if (input.manpower !== undefined) patch["manpower"] = input.manpower;
  if (input.progressPercent !== undefined) patch["progressPercent"] = input.progressPercent;
  if (input.startTime !== undefined) patch["startTime"] = input.startTime;
  if (input.endTime !== undefined) patch["endTime"] = input.endTime;
  const rows = await db.update(siteActivities).set(patch).where(eq(siteActivities.id, id)).returning();
  return rows[0] ?? null;
}
