import { and, asc, eq, sql } from "drizzle-orm";
import type { CoordinationInput } from "@sts/shared";
import type { QueryDb } from "@/db/client.js";
import { contractors, coordinationColors, coordinationDayLocks, coordinationDayNotes, coordinationItems, coordinationMaps, projectContractors, users } from "@/db/schema/index.js";

export async function getMap(db: QueryDb, projectId: string, lock = false) {
  const query = db.select().from(coordinationMaps).where(eq(coordinationMaps.projectId, projectId)).limit(1);
  const rows = await (lock ? query.for("update") : query);
  return rows[0] ?? null;
}
export async function listCoordinationContractors(db: QueryDb, projectId: string) {
  return db.select({ id: contractors.id, code: contractors.code, name: contractors.name, color: coordinationColors.color, revision: coordinationColors.revision })
    .from(projectContractors).innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .leftJoin(coordinationColors, and(eq(coordinationColors.projectId, projectId), eq(coordinationColors.contractorId, contractors.id)))
    .where(eq(projectContractors.projectId, projectId)).orderBy(asc(contractors.code));
}
export async function insertColor(db: QueryDb, projectId: string, contractorId: string, color: string) {
  await db.insert(coordinationColors).values({ projectId, contractorId, color }).onConflictDoNothing();
}
export async function updateColor(db: QueryDb, projectId: string, contractorId: string, color: string, revision: number) {
  const rows = await db.update(coordinationColors).set({ color, revision: sql`${coordinationColors.revision} + 1`, updatedAt: sql`now()` })
    .where(and(eq(coordinationColors.projectId, projectId), eq(coordinationColors.contractorId, contractorId), eq(coordinationColors.revision, revision))).returning();
  return rows[0] ?? null;
}
export function listItems(db: QueryDb, projectId: string, workDate: string) {
  return db.select().from(coordinationItems).where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.workDate, workDate)))
    .orderBy(asc(coordinationItems.createdAt), asc(coordinationItems.id));
}
export async function getItem(db: QueryDb, projectId: string, id: string) {
  const rows = await db.select().from(coordinationItems).where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.id, id))).limit(1);
  return rows[0] ?? null;
}
export async function insertItem(db: QueryDb, projectId: string, mapId: string, input: CoordinationInput, userId: string) {
  const [row] = await db.insert(coordinationItems).values({ projectId, mapId, ...input, createdBy: userId, updatedBy: userId }).returning();
  return row!;
}
export async function updateItem(db: QueryDb, projectId: string, id: string, input: CoordinationInput, revision: number, userId: string) {
  const rows = await db.update(coordinationItems).set({ ...input, revision: sql`${coordinationItems.revision} + 1`, updatedBy: userId, updatedAt: sql`now()` })
    .where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.id, id), eq(coordinationItems.revision, revision))).returning();
  return rows[0] ?? null;
}
export async function deleteItem(db: QueryDb, projectId: string, id: string, revision: number) {
  const rows = await db.delete(coordinationItems).where(and(eq(coordinationItems.projectId, projectId), eq(coordinationItems.id, id), eq(coordinationItems.revision, revision)))
    .returning({ id: coordinationItems.id });
  return rows.length === 1;
}
export async function getDayNote(db: QueryDb, projectId: string, workDate: string) {
  const rows = await db.select({ note: coordinationDayNotes.note, updatedAt: coordinationDayNotes.updatedAt, updatedByName: users.displayName, updatedByEmail: users.email })
    .from(coordinationDayNotes).leftJoin(users, eq(coordinationDayNotes.updatedBy, users.id))
    .where(and(eq(coordinationDayNotes.projectId, projectId), eq(coordinationDayNotes.workDate, workDate))).limit(1);
  return rows[0] ?? null;
}
export async function upsertDayNote(db: QueryDb, projectId: string, workDate: string, note: string, userId: string) {
  await db.insert(coordinationDayNotes).values({ projectId, workDate, note, updatedBy: userId })
    .onConflictDoUpdate({ target: [coordinationDayNotes.projectId, coordinationDayNotes.workDate], set: { note, updatedBy: userId, updatedAt: sql`now()` } });
}
export async function deleteDayNote(db: QueryDb, projectId: string, workDate: string) {
  await db.delete(coordinationDayNotes).where(and(eq(coordinationDayNotes.projectId, projectId), eq(coordinationDayNotes.workDate, workDate)));
}
export async function getDayLock(db: QueryDb, projectId: string, workDate: string) {
  const rows = await db.select({ lockedAt: coordinationDayLocks.lockedAt, lockedByName: users.displayName, lockedByEmail: users.email })
    .from(coordinationDayLocks).leftJoin(users, eq(coordinationDayLocks.lockedBy, users.id))
    .where(and(eq(coordinationDayLocks.projectId, projectId), eq(coordinationDayLocks.workDate, workDate))).limit(1);
  return rows[0] ?? null;
}
export async function insertDayLock(db: QueryDb, projectId: string, workDate: string, userId: string) {
  await db.insert(coordinationDayLocks).values({ projectId, workDate, lockedBy: userId }).onConflictDoNothing();
}
export async function deleteDayLock(db: QueryDb, projectId: string, workDate: string) {
  await db.delete(coordinationDayLocks).where(and(eq(coordinationDayLocks.projectId, projectId), eq(coordinationDayLocks.workDate, workDate)));
}
