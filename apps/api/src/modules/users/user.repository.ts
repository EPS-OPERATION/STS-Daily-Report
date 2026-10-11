import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { QueryDb } from "@/db/client.js";
import { contractorMemberships, contractors, users } from "@/db/schema/index.js";
import type { ListUsersQuery, UserStatus } from "./user.type.js";

export async function listUsers(db: QueryDb, q: ListUsersQuery) {
  const where = and(q.status ? eq(users.status, q.status) : undefined, q.search ? or(
    ilike(users.email, `%${q.search}%`), ilike(users.username, `%${q.search}%`), ilike(users.requestedCompanyName, `%${q.search}%`),
  ) : undefined);
  const [rows, totals] = await Promise.all([
    db.select({
      id: users.id, email: users.email, username: users.username, role: users.role, status: users.status,
      requestedContractorId: users.requestedContractorId, requestedContractorName: contractors.name,
      requestedCompanyName: users.requestedCompanyName, rejectionReason: users.rejectionReason,
      createdAt: users.createdAt, decidedAt: users.decidedAt,
    }).from(users).leftJoin(contractors, eq(users.requestedContractorId, contractors.id)).where(where)
      .orderBy(desc(users.createdAt), desc(users.id)).limit(q.pageSize).offset((q.page - 1) * q.pageSize),
    db.select({ value: count() }).from(users).where(where),
  ]);
  return { rows, total: Number(totals[0]?.value ?? 0) };
}
export async function decideUser(db: QueryDb, id: string, status: UserStatus, adminId: string, reason?: string) {
  await db.update(users).set({ status, decidedBy: adminId, decidedAt: sql`now()`, rejectionReason: reason ?? null, updatedAt: sql`now()` })
    .where(eq(users.id, id));
}
export async function activateMembership(db: QueryDb, userId: string, contractorId: string) {
  await db.insert(contractorMemberships).values({ userId, contractorId }).onConflictDoUpdate({
    target: [contractorMemberships.userId, contractorMemberships.contractorId],
    set: { status: "active", updatedAt: sql`now()` },
  });
}
