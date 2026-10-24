import { and, eq } from "drizzle-orm";
import type { QueryDb } from "@/db/client.js";
import { contractors, projectContractors } from "@/db/schema/index.js";

// The owner company (EPS) is a contractors row with isContractor = false. It is intentionally
// hidden from contractor lists and sign-up, but it is the company EPS manpower belongs to.
export async function findOwnerContractor(db: QueryDb, projectId: string) {
  const rows = await db
    .select({ id: contractors.id, code: contractors.code, name: contractors.name })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(
      and(
        eq(projectContractors.projectId, projectId),
        eq(contractors.isContractor, false),
        eq(contractors.active, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
