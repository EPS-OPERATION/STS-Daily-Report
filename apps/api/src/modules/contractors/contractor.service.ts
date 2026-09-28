import { getDb } from "@/db/client.js";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  createContractor,
  deleteContractor,
  getContractorByCode,
  getContractorById,
  listContractors,
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

export async function createContractorService(input: CreateContractorInput) {
  if (!input.code.trim() || !input.name.trim()) throw new ValidationError("code and name are required");
  const existing = await getContractorByCode(getDb(), input.code.trim());
  if (existing) throw new ConflictError(`Contractor code already exists: ${input.code}`, { code: input.code });
  return createContractor(getDb(), input);
}

export async function updateContractorService(id: string, input: UpdateContractorInput) {
  const db = getDb();
  const current = await getContractorById(db, id);
  if (!current) throw new NotFoundError("Contractor not found", { id });
  if (input.code !== undefined && input.code.trim() !== current.code) {
    const clash = await getContractorByCode(db, input.code.trim());
    if (clash && clash.id !== id) throw new ConflictError(`Contractor code already exists: ${input.code}`, { code: input.code });
  }
  const updated = await updateContractor(db, id, input);
  if (!updated) throw new NotFoundError("Contractor not found", { id });
  return updated;
}

export async function deleteContractorService(id: string) {
  const ok = await deleteContractor(getDb(), id);
  if (!ok) throw new NotFoundError("Contractor not found", { id });
}
