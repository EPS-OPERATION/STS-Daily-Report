import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { contractorAliases, contractors, coordinationColors, projectContractors } from "@/db/schema/index.js";
import type { QueryDb as Db } from "@/db/client.js";
import type { CreateContractorInput, ListContractorsQuery, UpdateContractorInput } from "./contractor.type.js";

const SORTABLE: Record<string, "code" | "name" | "createdAt"> = {
  code: "code",
  name: "name",
  created_at: "createdAt",
  createdAt: "createdAt",
};

const blankToNull = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);

export async function listContractors(db: Db, q: ListContractorsQuery) {
  const offset = (q.page - 1) * q.pageSize;
  const conditions = [];
  if (q.search) {
    const pattern = `%${q.search}%`;
    conditions.push(or(ilike(contractors.code, pattern), ilike(contractors.name, pattern)));
  }
  if (q.contractorsOnly) conditions.push(eq(contractors.isContractor, true), eq(contractors.active, true));
  if (q.projectId) {
    conditions.push(sql`${contractors.id} IN (SELECT ${projectContractors.contractorId} FROM ${projectContractors} WHERE ${projectContractors.projectId} = ${q.projectId})`);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortKey = (q.sort ? SORTABLE[q.sort] : undefined) ?? "createdAt";
  const column = contractors[sortKey];
  const orderBy = q.order === "asc" ? asc(column) : desc(column);

  // With a project, each company also carries its map colour there.
  const color = q.projectId
    ? sql<string | null>`(SELECT ${coordinationColors.color} FROM ${coordinationColors} WHERE ${coordinationColors.projectId} = ${q.projectId} AND ${coordinationColors.contractorId} = ${contractors.id})`
    : sql<string | null>`NULL`;
  const [rows, totalRows] = await Promise.all([
    db.select({ ...getTableColumns(), color }).from(contractors).where(where).orderBy(orderBy).limit(q.pageSize).offset(offset),
    db.select({ value: count() }).from(contractors).where(where),
  ]);
  return { rows, total: Number(totalRows[0]?.value ?? 0) };
}

function getTableColumns() {
  return {
    id: contractors.id,
    code: contractors.code,
    name: contractors.name,
    isContractor: contractors.isContractor,
    contactName: contractors.contactName,
    contactPhone: contractors.contactPhone,
    active: contractors.active,
    createdAt: contractors.createdAt,
    updatedAt: contractors.updatedAt,
  };
}

export async function getContractorById(db: Db, id: string) {
  const rows = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
  return rows[0] ?? null;
}

// A company by its code or by an old code it is still known by (LCE → L-tab).
export async function getContractorByCode(db: Db, code: string) {
  const rows = await db.select().from(contractors).where(eq(contractors.code, code)).limit(1);
  if (rows[0]) return rows[0];
  const alias = await db.select({ id: contractorAliases.contractorId }).from(contractorAliases).where(eq(contractorAliases.code, code)).limit(1);
  return alias[0] ? getContractorById(db, alias[0].id) : null;
}

export async function createContractor(db: Db, input: CreateContractorInput) {
  const rows = await db
    .insert(contractors)
    .values({
      code: input.code.trim(),
      name: input.name.trim(),
      contactName: blankToNull(input.contactName) ?? null,
      contactPhone: blankToNull(input.contactPhone) ?? null,
    })
    .returning();
  return rows[0]!;
}

export async function addContractorToProject(db: Db, projectId: string, contractorId: string) {
  await db.insert(projectContractors).values({ projectId, contractorId }).onConflictDoNothing();
}

export async function listProjectColors(db: Db, projectId: string) {
  const rows = await db.select({ color: coordinationColors.color }).from(coordinationColors).where(eq(coordinationColors.projectId, projectId));
  return rows.map((r) => r.color);
}

// Set (or first assign) a company's map colour; the revision bump makes open map tabs reload it.
export async function setContractorColor(db: Db, projectId: string, contractorId: string, color: string) {
  await db
    .insert(coordinationColors)
    .values({ projectId, contractorId, color })
    .onConflictDoUpdate({
      target: [coordinationColors.projectId, coordinationColors.contractorId],
      set: { color, revision: sql`${coordinationColors.revision} + 1`, updatedAt: sql`now()` },
    });
}

export async function updateContractor(db: Db, id: string, input: UpdateContractorInput) {
  const patch: Partial<{ code: string; name: string; contactName: string | null; contactPhone: string | null; active: boolean }> = {};
  if (input.code !== undefined) patch.code = input.code.trim();
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.contactName !== undefined) patch.contactName = blankToNull(input.contactName) ?? null;
  if (input.contactPhone !== undefined) patch.contactPhone = blankToNull(input.contactPhone) ?? null;
  if (input.active !== undefined) patch.active = input.active;
  if (Object.keys(patch).length === 0) return getContractorById(db, id);
  const rows = await db
    .update(contractors)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(contractors.id, id))
    .returning();
  return rows[0] ?? null;
}
