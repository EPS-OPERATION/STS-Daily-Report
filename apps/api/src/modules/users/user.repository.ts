import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { UserRole } from "@sts/shared";
import type { QueryDb } from "@/db/client.js";
import { contractorMemberships, contractors, sessions, users } from "@/db/schema/index.js";
import type { ListUsersQuery, UserStatus } from "./user.type.js";

// Approved contractors without a membership that asked for a company link (self-service).
const linkRequest = and(
  eq(users.status, "active"),
  sql`${users.requestedContractorId} IS NOT NULL`,
  sql`NOT EXISTS (SELECT 1 FROM ${contractorMemberships} m WHERE m.user_id = ${users.id} AND m.status = 'active')`,
);

export async function listUsers(db: QueryDb, q: ListUsersQuery) {
  const statusWhere = q.status === "pending"
    ? or(eq(users.status, "pending"), linkRequest)
    : q.status
      ? eq(users.status, q.status)
      : undefined;
  const where = and(statusWhere, q.search ? or(
    ilike(users.email, `%${q.search}%`), ilike(users.username, `%${q.search}%`), ilike(users.requestedCompanyName, `%${q.search}%`),
  ) : undefined);
  const [rows, totals] = await Promise.all([
    db.select({
      id: users.id, email: users.email, username: users.username, role: users.role, status: users.status,
      requestedContractorId: users.requestedContractorId, requestedContractorName: contractors.name,
      requestedCompanyName: users.requestedCompanyName, rejectionReason: users.rejectionReason,
      membershipCount: sql<number>`(SELECT count(*)::int FROM ${contractorMemberships} m WHERE m.user_id = ${users.id} AND m.status = 'active')`,
      createdAt: users.createdAt, decidedAt: users.decidedAt,
    }).from(users).leftJoin(contractors, eq(users.requestedContractorId, contractors.id)).where(where)
      .orderBy(desc(users.createdAt), desc(users.id)).limit(q.pageSize).offset((q.page - 1) * q.pageSize),
    db.select({ value: count() }).from(users).where(where),
  ]);
  return { rows, total: Number(totals[0]?.value ?? 0) };
}
export async function countActiveMemberships(db: QueryDb, userId: string) {
  const [row] = await db.select({ value: count() }).from(contractorMemberships)
    .where(and(eq(contractorMemberships.userId, userId), eq(contractorMemberships.status, "active")));
  return Number(row?.value ?? 0);
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
export async function setUserRole(db: QueryDb, id: string, role: UserRole) {
  await db.update(users).set({ role, updatedAt: sql`now()` }).where(eq(users.id, id));
}
// Disabling revokes every active session so the account is locked out immediately.
export async function setUserStatus(db: QueryDb, id: string, status: "active" | "disabled") {
  await db.update(users).set({ status, updatedAt: sql`now()` }).where(eq(users.id, id));
  if (status === "disabled") {
    await db.update(sessions).set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
  }
}
