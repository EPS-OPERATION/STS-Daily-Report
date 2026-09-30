import { and, asc, between, eq, inArray } from "drizzle-orm";
import { buildings, contractors, inspectionRequests } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

const columns = {
  id: inspectionRequests.id,
  projectId: inspectionRequests.projectId,
  contractorId: inspectionRequests.contractorId,
  contractorCode: contractors.code,
  contractorName: contractors.name,
  buildingId: inspectionRequests.buildingId,
  buildingCode: buildings.code,
  buildingName: buildings.name,
  reportDate: inspectionRequests.reportDate,
  inspectionDate: inspectionRequests.inspectionDate,
  inspectionTime: inspectionRequests.inspectionTime,
  inspectionType: inspectionRequests.inspectionType,
  workItem: inspectionRequests.workItem,
  location: inspectionRequests.location,
  drawingRef: inspectionRequests.drawingRef,
  readiness: inspectionRequests.readiness,
  status: inspectionRequests.status,
  result: inspectionRequests.result,
  epsNote: inspectionRequests.epsNote,
  statusChangedAt: inspectionRequests.statusChangedAt,
  createdAt: inspectionRequests.createdAt,
};

function baseQuery(db: Db) {
  return db
    .select(columns)
    .from(inspectionRequests)
    .innerJoin(contractors, eq(inspectionRequests.contractorId, contractors.id))
    .innerJoin(buildings, eq(inspectionRequests.buildingId, buildings.id));
}

export async function listRequests(
  db: Db,
  projectId: string,
  opts: { from: string; to: string; by: "inspection" | "report"; contractorIds?: string[] },
) {
  const dateCol = opts.by === "report" ? inspectionRequests.reportDate : inspectionRequests.inspectionDate;
  const conditions = [eq(inspectionRequests.projectId, projectId), between(dateCol, opts.from, opts.to)];
  if (opts.contractorIds) conditions.push(inArray(inspectionRequests.contractorId, opts.contractorIds));
  return baseQuery(db)
    .where(and(...conditions))
    .orderBy(asc(inspectionRequests.inspectionDate), asc(inspectionRequests.inspectionTime));
}

export async function getRequest(db: Db, id: string) {
  const rows = await baseQuery(db).where(eq(inspectionRequests.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertRequest(db: Db, values: typeof inspectionRequests.$inferInsert) {
  const rows = await db.insert(inspectionRequests).values(values).returning({ id: inspectionRequests.id });
  return rows[0]!.id;
}

export async function updateRequest(db: Db, id: string, values: Partial<typeof inspectionRequests.$inferInsert>) {
  await db
    .update(inspectionRequests)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(inspectionRequests.id, id));
}

export async function deleteRequest(db: Db, id: string) {
  await db.delete(inspectionRequests).where(eq(inspectionRequests.id, id));
}
