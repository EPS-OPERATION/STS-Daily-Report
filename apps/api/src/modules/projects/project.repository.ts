import { asc, eq, inArray } from "drizzle-orm";
import { contractors, projectContractors, projects } from "@/db/schema/index.js";
import type { DbExecutor } from "@/db/client.js";
import type { CreateProjectInput, UpdateProjectInput } from "./project.type.js";

export async function listProjects(db: DbExecutor, status: "active" | "inactive" | "all" = "active") {
  return db
    .select()
    .from(projects)
    .where(status === "all" ? undefined : eq(projects.status, status))
    .orderBy(asc(projects.code));
}

export async function listProjectContractors(db: DbExecutor, projectId: string) {
  return db
    .select({ id: contractors.id, code: contractors.code, name: contractors.name })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(eq(projectContractors.projectId, projectId))
    .orderBy(asc(contractors.code));
}

export async function getProjectById(db: DbExecutor, id: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProject(db: DbExecutor, input: CreateProjectInput) {
  return (await db.insert(projects).values(input).returning())[0]!;
}

export async function updateProject(db: DbExecutor, id: string, input: UpdateProjectInput) {
  return (
    (
      await db
        .update(projects)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning()
    )[0] ?? null
  );
}

export function findContractorsForAssignment(db: DbExecutor, ids: string[]) {
  return ids.length ? db.select({ id: contractors.id }).from(contractors).where(inArray(contractors.id, ids)) : [];
}

export async function replaceProjectContractors(db: DbExecutor, projectId: string, contractorIds: string[]) {
  await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).for("update");
  await db.delete(projectContractors).where(eq(projectContractors.projectId, projectId));
  if (contractorIds.length)
    await db.insert(projectContractors).values(contractorIds.map((contractorId) => ({ projectId, contractorId })));
}
