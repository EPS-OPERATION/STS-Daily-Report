import { COORDINATION_COLORS } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { assertEpsAdmin } from "@/middleware/require-eps.js";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  addContractorToProject,
  createContractor,
  getContractorByCode,
  getContractorById,
  listContractors,
  listProjectColors,
  setContractorColor,
  updateContractor,
} from "./contractor.repository.js";
import type { CreateContractorInput, ListContractorsQuery, UpdateContractorInput } from "./contractor.type.js";

export async function listContractorsService(query: ListContractorsQuery) {
  const db = getDb();
  return listContractors(db, query);
}

export async function getContractorService(id: string) {
  const row = await getContractorById(getDb(), id);
  if (!row) throw new NotFoundError("Contractor not found", { id });
  return row;
}

// The code must be new — also among the old codes companies are still known by (SEE → Sinoma).
async function assertCodeFree(code: string, selfId?: string) {
  const clash = await getContractorByCode(getDb(), code);
  if (clash && clash.id !== selfId) throw new ConflictError(`Code ${code} is already used by ${clash.code} · ${clash.name}`, { code });
}

// A new company joins the project straight away (sign-up, filters, map) with a free map colour.
export async function createContractorService(auth: AuthContext, input: CreateContractorInput) {
  assertEpsAdmin(auth);
  if (!input.code.trim() || !input.name.trim()) throw new ValidationError("code and name are required");
  await assertCodeFree(input.code.trim());
  return getDb().transaction(async (tx) => {
    const created = await createContractor(tx, input);
    await addContractorToProject(tx, input.projectId, created.id);
    const used = new Set((await listProjectColors(tx, input.projectId)).map((c) => c.toUpperCase()));
    const color = input.color ?? COORDINATION_COLORS.find((c) => !used.has(c)) ?? COORDINATION_COLORS[0];
    await setContractorColor(tx, input.projectId, created.id, color);
    return { ...created, color };
  });
}

export async function updateContractorService(auth: AuthContext, id: string, input: UpdateContractorInput) {
  assertEpsAdmin(auth);
  const db = getDb();
  const current = await getContractorById(db, id);
  if (!current) throw new NotFoundError("Contractor not found", { id });
  if (input.code !== undefined && input.code.trim() !== current.code) await assertCodeFree(input.code.trim(), id);
  if (input.active === false && !current.isContractor) throw new ValidationError("The owner company (EPS) cannot be deactivated");
  if (input.color !== undefined && !input.projectId) throw new ValidationError("projectId is required to change the map colour");
  return db.transaction(async (tx) => {
    const updated = await updateContractor(tx, id, input);
    if (!updated) throw new NotFoundError("Contractor not found", { id });
    if (input.color !== undefined && input.projectId) await setContractorColor(tx, input.projectId, id, input.color);
    return updated;
  });
}
