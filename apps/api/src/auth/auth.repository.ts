import { and, eq, or, sql } from "drizzle-orm";
import { authRateLimits, contractorMemberships, contractors, users, type NewUser } from "@/db/schema/index.js";
import type { QueryDb as Db } from "@/db/client.js";
import type { MembershipContractor } from "./auth.types.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByIdentifier(db: Db, identifier: string) {
  const value = normalizeEmail(identifier);
  const rows = await db.select().from(users).where(or(eq(users.email, value), eq(users.username, value))).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(db: Db, id: string, lock = false) {
  const query = db.select().from(users).where(eq(users.id, id)).limit(1);
  const rows = await (lock ? query.for("update") : query);
  return rows[0] ?? null;
}

export async function insertRegisteredUser(db: Db, input: NewUser) {
  await db.insert(users).values(input);
}

export async function countAuthAttempt(db: Db, key: string) {
  const expired = sql`${authRateLimits.windowStartedAt} <= now() - interval '15 minutes'`;
  const [row] = await db.insert(authRateLimits).values({ key }).onConflictDoUpdate({
    target: authRateLimits.key,
    set: {
      attempts: sql`CASE WHEN ${expired} THEN 1 ELSE ${authRateLimits.attempts} + 1 END`,
      windowStartedAt: sql`CASE WHEN ${expired} THEN now() ELSE ${authRateLimits.windowStartedAt} END`,
    },
  }).returning({ attempts: authRateLimits.attempts });
  return row!.attempts;
}

export async function findUserByEmail(db: Db, email: string) {
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return rows[0] ?? null;
}

export async function listActiveContractorsForUser(db: Db, userId: string, projectId?: string): Promise<MembershipContractor[]> {
  const rows = await db
    .select({ id: contractors.id, code: contractors.code, name: contractors.name, projectId: contractorMemberships.projectId })
    .from(contractorMemberships)
    .innerJoin(contractors, eq(contractorMemberships.contractorId, contractors.id))
    .where(
      and(
        eq(contractorMemberships.userId, userId),
        eq(contractorMemberships.status, "active"),
        projectId ? eq(contractorMemberships.projectId, projectId) : undefined,
      ),
    )
    .orderBy(contractors.code);
  return rows;
}

