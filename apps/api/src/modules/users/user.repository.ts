import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { UserRole } from "@sts/shared";
import type { QueryDb } from "@/db/client.js";
import { contractorMemberships, contractors, projectContractors, sessions, users } from "@/db/schema/index.js";
import type { ListUsersQuery, UserStatus } from "./user.type.js";

export async function listUsers(db: QueryDb, q: ListUsersQuery) {
  const statusWhere = q.status ? eq(users.status, q.status) : undefined;
  const where = and(statusWhere, q.search ? or(
    ilike(users.email, `%${q.search}%`), ilike(users.username, `%${q.search}%`), ilike(users.requestedCompanyName, `%${q.search}%`),
  ) : undefined);
  // Link state is project-scoped: an account may be linked in another project but not this one.
  const membershipCount = q.projectId
    ? sql<number>`(SELECT count(*)::int FROM ${contractorMemberships} m WHERE m.user_id = ${users.id} AND m.status = 'active' AND m.project_id = ${q.projectId})`
    : sql<number>`(SELECT count(*)::int FROM ${contractorMemberships} m WHERE m.user_id = ${users.id} AND m.status = 'active')`;
  const [rows, totals] = await Promise.all([
    db.select({
      id: users.id, email: users.email, username: users.username, role: users.role, status: users.status,
      requestedContractorId: users.requestedContractorId, requestedContractorName: contractors.name,
      requestedCompanyName: users.requestedCompanyName, rejectionReason: users.rejectionReason,
      membershipCount,
      createdAt: users.createdAt, decidedAt: users.decidedAt,
    }).from(users).leftJoin(contractors, eq(users.requestedContractorId, contractors.id)).where(where)
      .orderBy(desc(users.createdAt), desc(users.id)).limit(q.pageSize).offset((q.page - 1) * q.pageSize),
    db.select({ value: count() }).from(users).where(where),
  ]);
  return { rows, total: Number(totals[0]?.value ?? 0) };
}
export async function countActiveMemberships(db: QueryDb, userId: string, projectId?: string) {
  const [row] = await db.select({ value: count() }).from(contractorMemberships)
    .where(and(
      eq(contractorMemberships.userId, userId),
      eq(contractorMemberships.status, "active"),
      projectId ? eq(contractorMemberships.projectId, projectId) : undefined,
    ));
  return Number(row?.value ?? 0);
}
export async function listProjectIdsForContractor(db: QueryDb, contractorId: string) {
  const rows = await db.select({ projectId: projectContractors.projectId }).from(projectContractors)
    .where(eq(projectContractors.contractorId, contractorId));
  return rows.map((r) => r.projectId);
}
export async function decideUser(db: QueryDb, id: string, status: UserStatus, adminId: string, reason?: string) {
  await db.update(users).set({ status, decidedBy: adminId, decidedAt: sql`now()`, rejectionReason: reason ?? null, updatedAt: sql`now()` })
    .where(eq(users.id, id));
}
export async function activateMembership(db: QueryDb, userId: string, contractorId: string, projectId: string) {
  await db.insert(contractorMemberships).values({ userId, contractorId, projectId }).onConflictDoUpdate({
    target: [contractorMemberships.userId, contractorMemberships.contractorId, contractorMemberships.projectId],
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
      .where(and(eq(sessions.userId, id), sql`${sessions.revokedAt} IS NULL`));
  }
}
// New account created by an admin (already decided → active). Returns its id.
export async function insertUser(
  db: QueryDb,
  input: { email: string; username: string; displayName: string; passwordHash: string; role: UserRole; createdBy: string },
) {
  const [row] = await db
    .insert(users)
    .values({
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      role: input.role,
      status: "active",
      decidedBy: input.createdBy,
      decidedAt: new Date(),
    })
    .returning({ id: users.id });
  return row!.id;
}
