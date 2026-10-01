import { getDb } from "@/db/client.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  createProject,
  findContractorsForAssignment,
  getProjectById,
  listProjectContractors,
  listProjects,
  replaceProjectContractors,
  updateProject,
} from "./project.repository.js";
import type { CreateProjectInput, UpdateProjectInput } from "./project.type.js";

function normalize(input: UpdateProjectInput) {
  const result = { ...input };
  if (input.code !== undefined) {
    result.code = input.code.trim().toUpperCase();
    if (!result.code) throw new ValidationError("Project code is required");
  }
  if (input.name !== undefined) {
    result.name = input.name.trim();
    if (!result.name) throw new ValidationError("Project name is required");
  }
  if (input.description !== undefined) result.description = input.description?.trim() || null;
  return result;
}

export function listProjectsService(status?: "active" | "inactive" | "all") {
  return listProjects(getDb(), status);
}

export async function getProjectService(id: string) {
  const project = await getProjectById(getDb(), id);
  if (!project) throw new NotFoundError("Project not found", { id });
  return project;
}

export function createProjectService(input: CreateProjectInput) {
  return createProject(getDb(), { ...input, ...normalize(input) });
}

export async function updateProjectService(id: string, input: UpdateProjectInput) {
  await getProjectService(id);
  return updateProject(getDb(), id, normalize(input));
}

export async function listProjectContractorsService(projectId: string) {
  await getProjectService(projectId);
  return listProjectContractors(getDb(), projectId);
}

export async function assignProjectContractorsService(projectId: string, contractorIds: string[]) {
  await getProjectService(projectId);
  if (new Set(contractorIds).size !== contractorIds.length)
    throw new ValidationError("Contractor appears more than once");
  const contractors = await findContractorsForAssignment(getDb(), contractorIds);
  if (contractors.length !== contractorIds.length) throw new ValidationError("One or more Contractors do not exist");
  await getDb().transaction((tx) => replaceProjectContractors(tx, projectId, contractorIds));
  return listProjectContractors(getDb(), projectId);
}
