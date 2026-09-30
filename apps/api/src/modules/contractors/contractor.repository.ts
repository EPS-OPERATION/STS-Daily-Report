import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { contractors } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";
import type { CreateContractorInput, ListContractorsQuery, UpdateContractorInput } from "./contractor.type.js";

const SORTABLE: Record<string, "code" | "name" | "createdAt"> = {
  code: "code",
  name: "name",
  created_at: "createdAt",
  createdAt: "createdAt",
};

export async function listContractors(db: Db, q: ListContractorsQuery) {
  const offset = (q.page - 1) * q.pageSize;
  const conditions = [];
  if (q.search) {
    const pattern = `%${q.search}%`;
    conditions.push(or(ilike(contractors.code, pattern), ilike(contractors.name, pattern)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortKey = (q.sort ? SORTABLE[q.sort] : undefined) ?? "createdAt";
  const column = contractors[sortKey];
  const orderBy = q.order === "asc" ? asc(column) : desc(column);

  const [rows, totalRows] = await Promise.all([
    db.select().from(contractors).where(where).orderBy(orderBy).limit(q.pageSize).offset(offset),
    db.select({ value: count() }).from(contractors).where(where),
  ]);
  return { rows, total: Number(totalRows[0]?.value ?? 0) };
}

export async function getContractorById(db: Db, id: string) {
  const rows = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getContractorByCode(db: Db, code: string) {
  const rows = await db.select().from(contractors).where(eq(contractors.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function createContractor(db: Db, input: CreateContractorInput) {
  const rows = await db.insert(contractors).values({ code: input.code.trim(), name: input.name.trim() }).returning();
  return rows[0]!;
}

export async function updateContractor(db: Db, id: string, input: UpdateContractorInput) {
  const patch: Partial<{ code: string; name: string }> = {};
  if (input.code !== undefined) patch.code = input.code.trim();
  if (input.name !== undefined) patch.name = input.name.trim();
  if (Object.keys(patch).length === 0) return getContractorById(db, id);
  const rows = await db
    .update(contractors)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(contractors.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteContractor(db: Db, id: string) {
  const rows = await db.delete(contractors).where(eq(contractors.id, id)).returning({ id: contractors.id });
  return rows.length > 0;
}
