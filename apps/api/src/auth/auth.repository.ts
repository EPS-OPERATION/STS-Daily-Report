import { and, eq } from "drizzle-orm";
import { contractorMemberships, contractors, users } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";
import type { MembershipContractor } from "./auth.types.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(db: Db, email: string) {
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return rows[0] ?? null;
}

export async function listActiveContractorsForUser(db: Db, userId: string): Promise<MembershipContractor[]> {
  const rows = await db
    .select({ id: contractors.id, code: contractors.code, name: contractors.name })
    .from(contractorMemberships)
    .innerJoin(contractors, eq(contractorMemberships.contractorId, contractors.id))
    .where(
      and(eq(contractorMemberships.userId, userId), eq(contractorMemberships.status, "active")),
    );
  return rows;
}
