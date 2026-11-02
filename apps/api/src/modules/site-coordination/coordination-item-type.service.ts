import { COORDINATION_ICON_KEYS, COORDINATION_RESERVED_ICONS, isEpsAdmin, type CoordinationItemType } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  countItemsOfType,
  deleteItemType,
  findItemTypeByCode,
  findItemTypeById,
  insertItemType,
  listItemTypes,
  listItemTypesWithDefaults,
  nextItemTypeSortOrder,
  reorderItemTypes,
  updateItemType,
} from "./coordination-item-type.repository.js";

const THAI = /[\u0E00-\u0E7F]/;
const LATIN = /[A-Za-z]/;
const CODE = /^[a-z0-9_]{1,50}$/;
const RESERVED = new Set<string>(COORDINATION_RESERVED_ICONS);

function assertAdmin(auth: AuthContext) {
  if (!isEpsAdmin(auth.user.role)) throw new ForbiddenError("Only EPS administrators can manage map item types");
}

async function assertProject(projectId: string) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found");
}

function assertLabels(label: string | undefined, labelTh: string | undefined) {
  if (labelTh !== undefined && !THAI.test(labelTh)) throw new ValidationError("Thai label must be written in Thai", { field: "labelTh" });
  if (label !== undefined && (THAI.test(label) || !LATIN.test(label))) {
    throw new ValidationError("English label must be written in English", { field: "label" });
  }
}

function assertIconKey(iconKey: string) {
  if (!(COORDINATION_ICON_KEYS as readonly string[]).includes(iconKey)) {
    throw new ValidationError("Choose an icon from the list", { field: "iconKey" });
  }
}

function slug(label: string) {
  const value = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return value || `type_${Date.now().toString(36)}`;
}

export interface CreateItemTypeInput {
  code?: string;
  label: string;
  labelTh: string;
  iconKey: string;
  sortOrder?: number;
}

export interface UpdateItemTypeInput {
  label?: string;
  labelTh?: string;
  iconKey?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function listItemTypesService(auth: AuthContext, projectId: string, includeInactive = true) {
  assertAdmin(auth);
  await assertProject(projectId);
  return listItemTypesWithDefaults(getDb(), projectId, includeInactive);
}

export async function createItemTypeService(auth: AuthContext, projectId: string, input: CreateItemTypeInput): Promise<CoordinationItemType> {
  assertAdmin(auth);
  await assertProject(projectId);
  const label = input.label.trim();
  const labelTh = input.labelTh.trim();
  if (!label || !labelTh) throw new ValidationError("Thai and English labels are required");
  assertLabels(label, labelTh);
  assertIconKey(input.iconKey.trim());

  const code = (input.code?.trim() || slug(label)).toLowerCase();
  if (!CODE.test(code)) throw new ValidationError("Code must use a-z, 0-9 and underscores", { field: "code" });
  if (RESERVED.has(code)) throw new ConflictError(`'${code}' is reserved`);
  if (await findItemTypeByCode(getDb(), projectId, code)) {
    throw new ConflictError(`An item type with code '${code}' already exists in this project`);
  }

  return insertItemType(getDb(), {
    projectId,
    code,
    label,
    labelTh,
    iconKey: input.iconKey.trim(),
    // New types always go last in the "Add item" menu; the list itself is reordered by dragging.
    sortOrder: input.sortOrder ?? await nextItemTypeSortOrder(getDb(), projectId),
    isActive: true,
  });
}

export async function reorderItemTypesService(auth: AuthContext, projectId: string, ids: string[]): Promise<CoordinationItemType[]> {
  assertAdmin(auth);
  await assertProject(projectId);
  const db = getDb();
  const rows = await listItemTypes(db, projectId, true);
  const existing = new Set(rows.map((row) => row.id));
  if (ids.length !== rows.length || new Set(ids).size !== ids.length || ids.some((id) => !existing.has(id))) {
    throw new ValidationError("Send every item type exactly once");
  }
  return reorderItemTypes(db, projectId, ids);
}

export async function updateItemTypeService(auth: AuthContext, projectId: string, id: string, input: UpdateItemTypeInput): Promise<CoordinationItemType> {
  assertAdmin(auth);
  await assertProject(projectId);
  const row = await findItemTypeById(getDb(), projectId, id);
  if (!row) throw new NotFoundError("Item type not found", { id });

  assertLabels(input.label?.trim(), input.labelTh?.trim());
  if (input.iconKey !== undefined) assertIconKey(input.iconKey.trim());
  if (input.isActive === false && RESERVED.has(row.code)) {
    throw new ValidationError(`'${row.code}' must stay active: the map uses it for routes or text`);
  }

  const patch: Parameters<typeof updateItemType>[3] = {};
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) throw new ValidationError("English label is required");
    patch.label = label;
  }
  if (input.labelTh !== undefined) {
    const labelTh = input.labelTh.trim();
    if (!labelTh) throw new ValidationError("Thai label is required");
    patch.labelTh = labelTh;
  }
  if (input.iconKey !== undefined) patch.iconKey = input.iconKey.trim();
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const updated = await updateItemType(getDb(), projectId, id, patch);
  if (!updated) throw new NotFoundError("Item type not found", { id });
  return updated;
}

export async function deleteItemTypeService(auth: AuthContext, projectId: string, id: string) {
  assertAdmin(auth);
  await assertProject(projectId);
  const row = await findItemTypeById(getDb(), projectId, id);
  if (!row) throw new NotFoundError("Item type not found", { id });
  if (row.isSystem) throw new ConflictError("Built-in item types cannot be deleted. Hide it instead.");
  const used = await countItemsOfType(getDb(), projectId, row.code);
  if (used > 0) throw new ConflictError(`This item type is used by ${used} job${used === 1 ? "" : "s"}. Hide it instead.`);
  await deleteItemType(getDb(), projectId, id);
}
