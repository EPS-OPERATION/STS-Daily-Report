import { standardItemKey, type PermitType, type StandardItemKind } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { deleteStandardItem, findStandardItem, insertStandardItems, listStandardItems, type NewStandardItemRow } from "./report-standard-item.repository.js";
import type { MergeStandardItemsInput, StandardItemInput } from "./report-standard-item.type.js";

// A user acts for a contractor only through an active membership in this project.
async function assertContractorAccess(auth: AuthContext, contractorId: string, projectId: string) {
  const memberships = await listActiveContractorsForUser(getDb(), auth.user.id, projectId);
  if (!memberships.some((c) => c.id === contractorId)) {
    throw new ForbiddenError("You are not a member of this contractor", { contractorId });
  }
}

export async function listStandardItemsService(auth: AuthContext, projectId: string, contractorId: string) {
  await assertContractorAccess(auth, contractorId, projectId);
  return listStandardItems(getDb(), projectId, contractorId);
}

// Keeps only the shape each kind needs: equipment has no building; activity and permit do.
function toRow(item: StandardItemInput, buildingIds: Set<string>) {
  const label = item.label.trim();
  if (!label) throw new ValidationError("Name is required", { field: "label" });
  const kind: StandardItemKind = item.kind;
  if (kind !== "permit" && item.permitType) throw new ValidationError("Only permits take a permit type", { label });
  if (kind === "permit" && !item.permitType) throw new ValidationError("Permit type is required", { label });
  let buildingId: string | null = null;
  if (kind === "equipment") {
    if (item.buildingId) throw new ValidationError("Equipment takes no building", { label });
  } else {
    if (!item.buildingId || !buildingIds.has(item.buildingId)) throw new ValidationError("Choose a building of this project", { label });
    buildingId = item.buildingId;
  }
  const isPermit = kind === "permit";
  const permitType: PermitType | null = isPermit ? (item.permitType ?? null) : null;
  return {
    kind,
    label,
    buildingId,
    defaultCount: item.defaultCount,
    permitType,
    highRisk: isPermit && Boolean(item.highRisk),
    taskName: isPermit ? (item.taskName ?? "").trim() : "",
    supervisorName: isPermit ? (item.supervisorName ?? "").trim() : "",
  };
}

// Saves entries picked from a report. An entry already in the list is skipped, so saving twice keeps one.
export async function mergeStandardItemsService(auth: AuthContext, projectId: string, input: MergeStandardItemsInput) {
  await assertContractorAccess(auth, input.contractorId, projectId);
  const db = getDb();
  const buildingIds = new Set((await listBuildings(db, projectId)).map((b) => b.id));
  const seen = new Set((await listStandardItems(db, projectId, input.contractorId)).map((r) => standardItemKey(r)));
  const rows: NewStandardItemRow[] = [];
  for (const item of input.items) {
    const row = toRow(item, buildingIds);
    const key = standardItemKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...row, projectId, contractorId: input.contractorId });
  }
  await insertStandardItems(db, rows);
  return listStandardItems(db, projectId, input.contractorId);
}

export async function deleteStandardItemService(auth: AuthContext, projectId: string, id: string) {
  const db = getDb();
  const item = await findStandardItem(db, id);
  if (!item || item.projectId !== projectId) throw new NotFoundError("Standard item not found", { id });
  await assertContractorAccess(auth, item.contractorId, projectId);
  await deleteStandardItem(db, id);
}
