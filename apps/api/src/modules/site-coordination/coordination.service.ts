import { COORDINATION_COLORS, coordinationDateValid, coordinationGeometryError, coordinationRectangleValid, isEpsStaff, type CoordinationInput } from "@sts/shared";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { deleteItem, getItem, getMap, insertColor, insertItem, listCoordinationContractors, listItems, updateColor, updateItem } from "./coordination.repository.js";

async function access(auth: AuthContext, projectId: string, contractorId?: string) {
  if (!await getProjectById(getDb(), projectId)) throw new NotFoundError("Project not found");
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id, projectId);
  if (!isEpsStaff(auth.user.role) && (!memberships.length || (contractorId && !memberships.some((m) => m.id === contractorId)))) {
    throw new ForbiddenError("You cannot edit another contractor's plan or access this project");
  }
  return memberships;
}
function clean(input: CoordinationInput): CoordinationInput {
  if (!coordinationDateValid(input.workDate)) throw new ValidationError("Invalid work date");
  const title = input.title.trim();
  if (!title) throw new ValidationError("Enter a work title");
  const error = coordinationGeometryError(input.geometry);
  if (error) throw new ValidationError(error);
  if (input.areaKind === "rectangle") {
    // Rectangle transforms are stored as four polygon vertices, never viewport pixels.
    if (input.geometry.points.length !== 4) throw new ValidationError("A rectangle needs four corners");
  }
  return { ...input, title, rotation: ((input.rotation % 360) + 360) % 360, linkArea: input.linkArea !== false };
}
function dto(row: Awaited<ReturnType<typeof insertItem>>) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export async function coordinationService(auth: AuthContext, projectId: string, date: string) {
  const memberships = await access(auth, projectId);
  if (!coordinationDateValid(date)) throw new ValidationError("Invalid work date");
  const db = getDb();
  const map = await getMap(db, projectId);
  if (!map) throw new NotFoundError("This project has no coordination drawing configured");
  const [initialCompanies, items] = await Promise.all([listCoordinationContractors(db, projectId), listItems(db, projectId, date)]);
  const missingColors = initialCompanies.some((company) => !company.color);
  // Assign missing project colours once under the map lock. Normal polling is read-only.
  if (missingColors) await db.transaction(async (tx) => {
    await getMap(tx, projectId, true);
    const companies = await listCoordinationContractors(tx, projectId);
    const used = new Set(companies.flatMap((c) => c.color ? [c.color] : []));
    for (const c of companies) {
      if (c.color) continue;
      const color = COORDINATION_COLORS.find((v) => !used.has(v)) ?? COORDINATION_COLORS[companies.findIndex((v) => v.id === c.id) % COORDINATION_COLORS.length]!;
      await insertColor(tx, projectId, c.id, color);
      used.add(color);
    }
  });
  const companies = missingColors ? await listCoordinationContractors(db, projectId) : initialCompanies;
  return {
    map: { id: map.id, projectId, imagePath: map.imagePath, width: map.width, height: map.height },
    contractors: companies.map((c) => ({ ...c, color: c.color!, revision: c.revision! })),
    items: items.map(dto), editableContractorIds: isEpsStaff(auth.user.role) ? companies.map((c) => c.id) : memberships.map((m) => m.id),
    canManageColors: isEpsStaff(auth.user.role),
  };
}
export async function saveCoordinationService(auth: AuthContext, projectId: string, raw: CoordinationInput, id?: string, revision?: number) {
  const input = clean(raw);
  await access(auth, projectId, input.contractorId);
  const db = getDb();
  const map = await getMap(db, projectId);
  if (!map) throw new NotFoundError("Coordination drawing not configured");
  if (input.areaKind === "rectangle" && !coordinationRectangleValid(input.geometry.points, map.width, map.height)) throw new ValidationError("Rectangle corners must form a rectangle");
  const companies = await listCoordinationContractors(db, projectId);
  if (!companies.some((c) => c.id === input.contractorId)) throw new ValidationError("Contractor is not assigned to this project");
  if (!id) return dto(await insertItem(db, projectId, map.id, input, auth.user.id));
  const current = await getItem(db, projectId, id);
  if (!current) throw new NotFoundError("Work item not found");
  await access(auth, projectId, current.contractorId);
  if (input.workDate !== current.workDate) throw new ValidationError("Edit the work on its original date");
  const row = await updateItem(db, projectId, id, input, revision!, auth.user.id);
  if (!row) throw new ConflictError("This work item was changed by another user. Reload before saving.");
  return dto(row);
}
export async function deleteCoordinationService(auth: AuthContext, projectId: string, id: string, revision: number) {
  const row = await getItem(getDb(), projectId, id);
  if (!row) throw new NotFoundError("Work item not found");
  await access(auth, projectId, row.contractorId);
  if (!await deleteItem(getDb(), projectId, id, revision)) throw new ConflictError("This work item was changed by another user. Reload before deleting.");
}
export async function coordinationColorService(auth: AuthContext, projectId: string, contractorId: string, color: string, revision: number) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can change contractor colours");
  await access(auth, projectId);
  const result = await updateColor(getDb(), projectId, contractorId, color.toUpperCase(), revision);
  if (!result) throw new ConflictError("The contractor colour changed. Reload and try again.");
  return { contractorId, color: result.color, revision: result.revision };
}
