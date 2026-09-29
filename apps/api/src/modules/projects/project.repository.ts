import { asc, eq } from "drizzle-orm";
import { contractors, projectContractors, projects } from "@/db/schema/index.js";
import type { Db } from "@/db/client.js";

export async function listProjects(db: Db) {
  return db
    .select({ id: projects.id, code: projects.code, name: projects.name, status: projects.status })
    .from(projects)
    .where(eq(projects.status, "active"))
    .orderBy(asc(projects.code));
}

export async function listProjectContractors(db: Db, projectId: string) {
  return db
    .select({ id: contractors.id, code: contractors.code, name: contractors.name })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(eq(projectContractors.projectId, projectId))
    .orderBy(asc(contractors.code));
}

export async function getProjectById(db: Db, id: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}
