import { and, asc, eq, max, sql } from "drizzle-orm";
import type { CoordinationPoint } from "@sts/shared";
import type { QueryDb } from "@/db/client.js";
import { coordinationSections, dailyReportAllocations, dailyReportForecasts } from "@/db/schema/index.js";

const columns = {
  id: coordinationSections.id, mapId: coordinationSections.mapId, code: coordinationSections.code, work: coordinationSections.work,
  color: coordinationSections.color, points: coordinationSections.points, sortOrder: coordinationSections.sortOrder,
};
export type SectionInput = { code: string; work: string; color: string; points: CoordinationPoint[] };

export function listSections(db: QueryDb, projectId: string) {
  return db.select(columns).from(coordinationSections).where(eq(coordinationSections.projectId, projectId))
    .orderBy(asc(coordinationSections.sortOrder), asc(coordinationSections.createdAt), asc(coordinationSections.id));
}
export async function getSection(db: QueryDb, projectId: string, id: string) {
  const [row] = await db.select(columns).from(coordinationSections).where(and(eq(coordinationSections.projectId, projectId), eq(coordinationSections.id, id))).limit(1);
  return row ?? null;
}
// Another section of the same map with this code (case-insensitive), other than `exceptId`.
export async function findSectionByCode(db: QueryDb, mapId: string, code: string, exceptId?: string) {
  const rows = await db.select({ id: coordinationSections.id }).from(coordinationSections)
    .where(and(eq(coordinationSections.mapId, mapId), sql`lower(${coordinationSections.code}) = lower(${code})`));
  return rows.find((r) => r.id !== exceptId) ?? null;
}
export async function nextSectionSortOrder(db: QueryDb, mapId: string) {
  const [row] = await db.select({ top: max(coordinationSections.sortOrder) }).from(coordinationSections).where(eq(coordinationSections.mapId, mapId));
  return (row?.top ?? 0) + 10;
}
export async function insertSection(db: QueryDb, projectId: string, mapId: string, input: SectionInput, sortOrder: number, userId: string) {
  const [row] = await db.insert(coordinationSections).values({ projectId, mapId, ...input, sortOrder, updatedBy: userId }).returning(columns);
  return row!;
}
export async function updateSection(db: QueryDb, projectId: string, id: string, input: SectionInput, userId: string) {
  const [row] = await db.update(coordinationSections).set({ ...input, updatedBy: userId, updatedAt: new Date() })
    .where(and(eq(coordinationSections.projectId, projectId), eq(coordinationSections.id, id))).returning(columns);
  return row ?? null;
}
// Report rows (activities, extra work, forecasts) that name this section as their place.
export async function countSectionReportRows(db: QueryDb, id: string) {
  const [a] = await db.select({ n: sql<number>`count(*)::int` }).from(dailyReportAllocations).where(eq(dailyReportAllocations.sectionId, id));
  const [f] = await db.select({ n: sql<number>`count(*)::int` }).from(dailyReportForecasts).where(eq(dailyReportForecasts.sectionId, id));
  return (a?.n ?? 0) + (f?.n ?? 0);
}
export async function deleteSection(db: QueryDb, projectId: string, id: string) {
  await db.delete(coordinationSections).where(and(eq(coordinationSections.projectId, projectId), eq(coordinationSections.id, id)));
}
