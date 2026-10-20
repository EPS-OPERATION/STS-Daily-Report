import { COORDINATION_COLORS, coordinationDateValid, coordinationGeometryError, coordinationRectangleValid, isEpsStaff, routeGeometryError, type RoadSegment, type CoordinationInput, type CoordinationReport } from "@sts/shared";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { coordinationVersion } from "./coordination.repository.js";
import { deleteRoadSegment, findRoadSegmentByName, getRoadSegment, insertRoadSegment, listRoadSegments, updateRoadSegment, type RoadSegmentInput } from "./coordination.repository.js";
import { findItemTypeByCode, listItemTypesWithDefaults } from "./coordination-item-type.repository.js";
import { deleteDayLock, deleteDayNote, deleteItem, getDayLock, getDayNote, getItem, getMap, insertDayLock, insertColor, insertItem, listCoordinationContractors, listCoordinationContractorsByIds, listItems, updateColor, updateItem, upsertDayNote } from "./coordination.repository.js";
import { getContractorById } from "@/modules/contractors/contractor.repository.js";

async function access(auth: AuthContext, projectId: string, contractorId?: string) {
  // Independent reads: one round trip instead of two.
  const [project, memberships] = await Promise.all([getProjectById(getDb(), projectId), listActiveContractorsForUser(getDb(), auth.user.id, projectId)]);
  if (!project) throw new NotFoundError("Project not found");
  if (!isEpsStaff(auth.user.role) && (!memberships.length || (contractorId && !memberships.some((m) => m.id === contractorId)))) {
    throw new ForbiddenError("You cannot edit another contractor's plan or access this project");
  }
  return memberships;
}
function clean(input: CoordinationInput): CoordinationInput {
  if (!coordinationDateValid(input.workDate)) throw new ValidationError("Invalid work date");
  const title = input.title.trim();
  if (!title) throw new ValidationError("Enter a work title");
  // A road route is a line; every other job has an area. The two never mix.
  if ((input.areaKind === "route") !== (input.geometry.type === "polyline")) throw new ValidationError("A road route needs a line, other jobs need an area");
  if ((input.areaKind === "route") !== (input.icon === "road")) throw new ValidationError("Road routes use the road type");
  const error = coordinationGeometryError(input.geometry);
  if (error) throw new ValidationError(error);
  if (input.areaKind === "rectangle") {
    // Rectangle transforms are stored as four polygon vertices, never viewport pixels.
    if (input.geometry.points.length !== 4) throw new ValidationError("A rectangle needs four corners");
  }
  return { ...input, title, rotation: ((input.rotation % 360) + 360) % 360, linkArea: input.linkArea !== false, twoWay: input.areaKind === "route" && input.twoWay === true, iconScale: Math.round((input.iconScale ?? 1) * 100) / 100, note: input.note?.trim() || null };
}
const lockDto = (row: NonNullable<Awaited<ReturnType<typeof getDayLock>>>) =>
  ({ lockedAt: row.lockedAt.toISOString(), lockedByName: row.lockedByName ?? row.lockedByEmail ?? null });
// Every write to a locked day is refused — EPS included (unlock first).
async function assertUnlocked(projectId: string, workDate: string) {
  if (await getDayLock(getDb(), projectId, workDate)) throw new ConflictError("This day's map is locked by EPS. Unlock it before making changes.");
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
  const [initialProjectCompanies, items, itemTypes, dayNote, lock, version] = await Promise.all([listCoordinationContractors(db, projectId), listItems(db, projectId, date), listItemTypesWithDefaults(db, projectId, true), getDayNote(db, projectId, date), getDayLock(db, projectId, date), coordinationVersion(db, projectId, date)]);
  const missingContractorIds = [...new Set(items.map((i) => i.contractorId))].filter((id) => !initialProjectCompanies.some((c) => c.id === id));
  const extraCompanies = missingContractorIds.length > 0 ? await listCoordinationContractorsByIds(db, projectId, missingContractorIds) : [];
  const initialCompanies = [...initialProjectCompanies, ...extraCompanies];
  const missingColors = initialCompanies.some((company) => !company.color);
  // Assign missing project colours once under the map lock. Normal polling is read-only.
  if (missingColors) await db.transaction(async (tx) => {
    await getMap(tx, projectId, true);
    const projCompanies = await listCoordinationContractors(tx, projectId);
    const extras = missingContractorIds.length > 0 ? await listCoordinationContractorsByIds(tx, projectId, missingContractorIds) : [];
    const companies = [...projCompanies, ...extras];
    const used = new Set(companies.flatMap((c) => c.color ? [c.color] : []));
    for (const c of companies) {
      if (c.color) continue;
      const color = COORDINATION_COLORS.find((v) => !used.has(v)) ?? COORDINATION_COLORS[companies.findIndex((v) => v.id === c.id) % COORDINATION_COLORS.length]!;
      await insertColor(tx, projectId, c.id, color);
      used.add(color);
    }
  });
  const companies = missingColors
    ? [...(await listCoordinationContractors(db, projectId)), ...(missingContractorIds.length > 0 ? await listCoordinationContractorsByIds(db, projectId, missingContractorIds) : [])]
    : initialCompanies;
  return {
    map: { id: map.id, projectId, imagePath: map.imagePath, width: map.width, height: map.height },
    contractors: companies.map((c) => ({ ...c, color: c.color!, revision: c.revision! })),
    items: items.map(dto), itemTypes, editableContractorIds: lock ? [] : isEpsStaff(auth.user.role) ? companies.filter((c) => c.isContractor).map((c) => c.id) : memberships.map((m) => m.id),
    canManageColors: isEpsStaff(auth.user.role),
    dayNote: dayNote ? { note: dayNote.note, updatedAt: dayNote.updatedAt.toISOString(), updatedByName: dayNote.updatedByName ?? dayNote.updatedByEmail ?? null } : null,
    canEditDayNote: !lock && isEpsStaff(auth.user.role),
    lock: lock ? lockDto(lock) : null,
    canLock: isEpsStaff(auth.user.role),
    version,
  };
}
// The open map polls this instead of the whole day (see coordinationVersion): same access rule, one small query.
export async function coordinationVersionService(auth: AuthContext, projectId: string, date: string) {
  await access(auth, projectId);
  if (!coordinationDateValid(date)) throw new ValidationError("Invalid work date");
  return { version: await coordinationVersion(getDb(), projectId, date) };
}
// Day note: EPS only; an empty note removes it.
export async function saveDayNoteService(auth: AuthContext, projectId: string, date: string, raw: string) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can write the day note");
  await access(auth, projectId);
  if (!coordinationDateValid(date)) throw new ValidationError("Invalid work date");
  await assertUnlocked(projectId, date);
  const note = raw.trim();
  const db = getDb();
  if (!note) { await deleteDayNote(db, projectId, date); return null; }
  await upsertDayNote(db, projectId, date, note, auth.user.id);
  const row = await getDayNote(db, projectId, date);
  return row ? { note: row.note, updatedAt: row.updatedAt.toISOString(), updatedByName: row.updatedByName ?? row.updatedByEmail ?? null } : null;
}
export async function saveCoordinationService(auth: AuthContext, projectId: string, raw: CoordinationInput, id?: string, revision?: number) {
  const input = clean(raw);
  await access(auth, projectId, input.contractorId);
  const db = getDb();
  // The code must belong to this project's catalog. Hidden types stay usable on existing jobs,
  // but a new job can only use a visible one.
  const itemType = await findItemTypeByCode(db, projectId, input.icon);
  if (!itemType) throw new ValidationError("Choose a valid item type");
  if (!id && !itemType.isActive) throw new ValidationError("This item type is hidden; choose another one");
  const map = await getMap(db, projectId);
  if (!map) throw new NotFoundError("Coordination drawing not configured");
  if (input.areaKind === "rectangle" && !coordinationRectangleValid(input.geometry.points, map.width, map.height)) throw new ValidationError("Rectangle corners must form a rectangle");
  const companies = await listCoordinationContractors(db, projectId);
  const isValidContractor = companies.some((c) => c.id === input.contractorId) || (isEpsStaff(auth.user.role) && Boolean(await getContractorById(db, input.contractorId)));
  if (!isValidContractor) throw new ValidationError("Contractor is not assigned to this project");
  if (!id) { await assertUnlocked(projectId, input.workDate); return dto(await insertItem(db, projectId, map.id, input, auth.user.id)); }
  const current = await getItem(db, projectId, id);
  if (!current) throw new NotFoundError("Work item not found");
  await assertUnlocked(projectId, current.workDate);
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
  await assertUnlocked(projectId, row.workDate);
  if (!await deleteItem(getDb(), projectId, id, revision)) throw new ConflictError("This work item was changed by another user. Reload before deleting.");
}
export async function coordinationColorService(auth: AuthContext, projectId: string, contractorId: string, color: string, revision: number) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can change contractor colours");
  await access(auth, projectId);
  const result = await updateColor(getDb(), projectId, contractorId, color.toUpperCase(), revision);
  if (!result) throw new ConflictError("The contractor colour changed. Reload and try again.");
  return { contractorId, color: result.color, revision: result.revision };
}
// EPS stamp / unstamp a day's map.
export async function setDayLockService(auth: AuthContext, projectId: string, date: string, locked: boolean) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can lock or unlock the day's map");
  await access(auth, projectId);
  if (!coordinationDateValid(date)) throw new ValidationError("Invalid work date");
  const db = getDb();
  if (locked) await insertDayLock(db, projectId, date, auth.user.id);
  else await deleteDayLock(db, projectId, date);
  const row = await getDayLock(db, projectId, date);
  return row ? lockDto(row) : null;
}
// Printable day report (EPS only): the drawing with every job and the day note.
export async function coordinationReportService(auth: AuthContext, projectId: string, date: string): Promise<CoordinationReport> {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can export the day's map report");
  const [data, project] = await Promise.all([coordinationService(auth, projectId, date), getProjectById(getDb(), projectId)]);
  return {
    projectName: project?.name ?? "",
    date,
    generatedAt: new Date().toISOString(),
    generatedByName: auth.user.displayName ?? auth.user.email,
    map: data.map,
    contractors: data.contractors,
    items: data.items,
    itemTypes: data.itemTypes,
    dayNote: data.dayNote,
  };
}

// ---- road register: everyone on the project reads it; EPS staff keep it up to date ----
export async function listRoadSegmentsService(auth: AuthContext, projectId: string): Promise<RoadSegment[]> {
  await access(auth, projectId);
  return listRoadSegments(getDb(), projectId);
}

function cleanSegment(raw: { road: string; name: string; points: RoadSegment["points"]; closed?: boolean }): RoadSegmentInput {
  const road = raw.road.trim();
  const name = raw.name.trim();
  if (!road || !name) throw new ValidationError("Enter the road code and the segment name");
  const error = routeGeometryError(raw.points);
  if (error) throw new ValidationError(error);
  return { road, name, points: raw.points, closed: raw.closed ?? false };
}

export async function saveRoadSegmentService(auth: AuthContext, projectId: string, raw: Parameters<typeof cleanSegment>[0], id?: string): Promise<RoadSegment> {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can change the road register");
  await access(auth, projectId);
  const input = cleanSegment(raw);
  const db = getDb();
  // Same name = another piece of the same road, so the code must match (one name never spans two roads).
  const same = await findRoadSegmentByName(db, projectId, input.name, id);
  if (same && same.road !== input.road) {
    throw new ConflictError(`"${input.name}" is road ${same.road} — use code ${same.road} to add another piece of it, or choose another name`);
  }
  if (!id) return insertRoadSegment(db, projectId, input, auth.user.id);
  const row = await updateRoadSegment(db, projectId, id, input, auth.user.id);
  if (!row) throw new NotFoundError("Road segment not found");
  return row;
}

export async function deleteRoadSegmentService(auth: AuthContext, projectId: string, id: string) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can change the road register");
  await access(auth, projectId);
  const db = getDb();
  if (!await getRoadSegment(db, projectId, id)) throw new NotFoundError("Road segment not found");
  await deleteRoadSegment(db, projectId, id);
}
