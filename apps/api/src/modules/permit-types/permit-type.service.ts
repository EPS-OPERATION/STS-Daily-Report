import { isEpsStaff } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  deletePermitType,
  findPermitTypeByCode,
  findPermitTypeById,
  insertPermitType,
  listPermitTypes,
  updatePermitType,
} from "./permit-type.repository.js";
import type { CreatePermitTypeInput, UpdatePermitTypeInput } from "./permit-type.type.js";

const THAI = /[฀-๿]/;
const LATIN = /[A-Za-z]/;
// Thai name must contain Thai letters; English name must be Latin letters without Thai.
function assertLabels(label: string | undefined, labelTh: string | undefined) {
  if (labelTh !== undefined && !THAI.test(labelTh)) throw new ValidationError("Thai label must be written in Thai", { field: "labelTh" });
  if (label !== undefined && (THAI.test(label) || !LATIN.test(label))) {
    throw new ValidationError("English label must be written in English", { field: "label" });
  }
}

function assertEps(auth: AuthContext) {
  if (!isEpsStaff(auth.user.role)) {
    throw new ForbiddenError("Only EPS staff can manage permit types");
  }
}

export async function listPermitTypesService(projectId: string, includeInactive = false) {
  return listPermitTypes(getDb(), projectId, includeInactive);
}

export async function createPermitTypeService(auth: AuthContext, projectId: string, input: CreatePermitTypeInput) {
  assertEps(auth);
  const code = input.code.trim().toLowerCase().replace(/\s+/g, "_");
  if (!code) throw new ValidationError("Code is required", { field: "code" });
  const label = input.label.trim();
  const labelTh = input.labelTh.trim();
  if (!label || !labelTh) throw new ValidationError("Label in English and Thai are required");
  assertLabels(label, labelTh);

  const existing = await findPermitTypeByCode(getDb(), projectId, code);
  if (existing) {
    throw new ConflictError(`Permit type code '${code}' already exists in this project`);
  }

  return insertPermitType(getDb(), {
    projectId,
    code,
    label,
    labelTh,
    iconKey: (input.iconKey ?? "other").trim(),
    sortOrder: input.sortOrder ?? 100,
    isActive: input.isActive ?? true,
  });
}

export async function updatePermitTypeService(
  auth: AuthContext,
  projectId: string,
  id: string,
  input: UpdatePermitTypeInput,
) {
  assertEps(auth);
  const row = await findPermitTypeById(getDb(), id);
  if (!row || row.projectId !== projectId) {
    throw new NotFoundError("Permit type not found", { id });
  }

  assertLabels(input.label?.trim(), input.labelTh?.trim());
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label.trim();
  if (input.labelTh !== undefined) patch.labelTh = input.labelTh.trim();
  if (input.iconKey !== undefined) patch.iconKey = input.iconKey.trim();
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  return updatePermitType(getDb(), id, patch);
}

export async function deletePermitTypeService(auth: AuthContext, projectId: string, id: string) {
  assertEps(auth);
  const row = await findPermitTypeById(getDb(), id);
  if (!row || row.projectId !== projectId) {
    throw new NotFoundError("Permit type not found", { id });
  }
  await deletePermitType(getDb(), id);
}
