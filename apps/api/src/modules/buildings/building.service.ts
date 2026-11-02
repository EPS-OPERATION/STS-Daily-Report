import { isEpsAdmin, isEpsStaff } from "@sts/shared";
import { getDb } from "@/db/client.js";
import type { AuthContext } from "@/auth/auth.types.js";
import type { SiteMapView } from "@/db/schema/index.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import {
  deleteMarker,
  deletePart,
  deletePartMarker,
  findBuildingByCode,
  findPartByCode,
  getBuilding,
  insertBuilding,
  listBuildingsForAdmin,
  setBuildingOrder,
  updateBuilding,
  getPart,
  insertPart,
  listBuildings,
  listMarkers,
  listPartMarkers,
  listParts,
  updatePart,
  upsertMarker,
  upsertPartMarker,
} from "./building.repository.js";

export async function listBuildingsService(projectId: string) {
  const db = getDb();
  const project = await getProjectById(db, projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  return listBuildings(db, projectId);
}

// ---- Admin: manage the building list (eps_admin). Buildings are hidden, never deleted:
// daily reports reference them (FK restrict) and old reports must keep their building names.
function assertAdmin(auth: AuthContext) {
  if (!isEpsAdmin(auth.user.role)) throw new ForbiddenError("Only EPS admin can manage buildings");
}

async function assertProjectExists(projectId: string) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found", { projectId });
}

export interface BuildingInput { code: string; name: string; nameTh?: string | null; status?: "active" | "inactive" }

const clean = (input: Partial<BuildingInput>) => ({
  ...(input.code !== undefined ? { code: input.code.trim() } : {}),
  ...(input.name !== undefined ? { name: input.name.trim() } : {}),
  ...(input.nameTh !== undefined ? { nameTh: input.nameTh?.trim() || null } : {}),
  ...(input.status !== undefined ? { status: input.status } : {}),
});

export async function listBuildingsAdminService(auth: AuthContext, projectId: string) {
  assertAdmin(auth);
  await assertProjectExists(projectId);
  return listBuildingsForAdmin(getDb(), projectId);
}

export async function createBuildingService(auth: AuthContext, projectId: string, input: BuildingInput) {
  assertAdmin(auth);
  await assertProjectExists(projectId);
  const db = getDb();
  const values = clean(input);
  if (!values.code || !values.name) throw new ValidationError("Code and name are required");
  if (await findBuildingByCode(db, projectId, values.code)) {
    throw new ConflictError("Building code already exists in this project", { code: values.code });
  }
  return insertBuilding(db, projectId, { code: values.code, name: values.name, nameTh: values.nameTh ?? null });
}

export async function updateBuildingService(auth: AuthContext, projectId: string, buildingId: string, input: Partial<BuildingInput>) {
  assertAdmin(auth);
  const db = getDb();
  const building = await getBuilding(db, buildingId);
  if (!building || building.projectId !== projectId) throw new NotFoundError("Building not found", { buildingId });
  const values = clean(input);
  if (values.code === "" || values.name === "") throw new ValidationError("Code and name are required");
  if (values.code && values.code.toLowerCase() !== building.code.toLowerCase()) {
    const other = await findBuildingByCode(db, projectId, values.code);
    if (other && other.id !== buildingId) throw new ConflictError("Building code already exists in this project", { code: values.code });
  }
  return updateBuilding(db, buildingId, values);
}

export async function reorderBuildingsService(auth: AuthContext, projectId: string, ids: string[]) {
  assertAdmin(auth);
  const db = getDb();
  const all = await listBuildingsForAdmin(db, projectId);
  const known = new Set(all.map((b) => b.id));
  if (ids.length !== all.length || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    throw new ValidationError("Send every building of the project exactly once");
  }
  await setBuildingOrder(db, projectId, ids);
  return listBuildingsForAdmin(db, projectId);
}

// Buildings in site order with their marker (if placed) on each map view.
export async function siteMapService(projectId: string) {
  const db = getDb();
  const [list, markers, parts, partMarkers] = await Promise.all([
    listBuildingsService(projectId),
    listMarkers(db, projectId),
    listParts(db, projectId),
    listPartMarkers(db, projectId),
  ]);
  const pointsOf = (rows: { view: string; x: number; y: number }[]) => {
    const at = (view: SiteMapView) => {
      const m = rows.find((x) => x.view === view);
      return m ? { x: m.x, y: m.y } : null;
    };
    return { overview: at("overview"), topview: at("topview"), plan: at("plan") };
  };
  return list.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    nameTh: b.nameTh,
    markers: pointsOf(markers.filter((m) => m.buildingId === b.id)),
    parts: parts
      .filter((p) => p.buildingId === b.id)
      .map((p) => ({ id: p.id, code: p.code, name: p.name, status: p.status, markers: pointsOf(partMarkers.filter((m) => m.partId === p.id)) })),
  }));
}

async function assertEditable(auth: AuthContext, projectId: string, buildingId: string) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can configure the site map");
  const b = await getBuilding(getDb(), buildingId);
  if (!b || b.projectId !== projectId) throw new NotFoundError("Building not found", { buildingId });
}

export async function placeMarkerService(
  auth: AuthContext,
  projectId: string,
  buildingId: string,
  view: SiteMapView,
  x: number,
  y: number,
) {
  await assertEditable(auth, projectId, buildingId);
  await upsertMarker(getDb(), buildingId, view, x, y, auth.user.id);
  return siteMapService(projectId);
}

export async function removeMarkerService(auth: AuthContext, projectId: string, buildingId: string, view: SiteMapView) {
  await assertEditable(auth, projectId, buildingId);
  await deleteMarker(getDb(), buildingId, view);
  return siteMapService(projectId);
}

// ---- work parts (EPS) --------------------------------------------------------

export interface PartInput {
  code: string;
  name: string;
  status: "active" | "inactive";
}

export async function createPartService(auth: AuthContext, projectId: string, buildingId: string, input: PartInput) {
  await assertEditable(auth, projectId, buildingId);
  const code = input.code.trim().toUpperCase();
  if (await findPartByCode(getDb(), buildingId, code)) throw new ConflictError(`Part code already used: ${code}`, { code });
  const id = await insertPart(getDb(), { buildingId, code, name: input.name.trim(), status: input.status });
  return { id, map: await siteMapService(projectId) };
}

async function loadPart(auth: AuthContext, projectId: string, partId: string) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can configure the site map");
  const part = await getPart(getDb(), partId);
  if (!part || part.projectId !== projectId) throw new NotFoundError("Work part not found", { partId });
  return part;
}

export async function updatePartService(auth: AuthContext, projectId: string, partId: string, input: PartInput) {
  const part = await loadPart(auth, projectId, partId);
  const code = input.code.trim().toUpperCase();
  const clash = await findPartByCode(getDb(), part.buildingId, code);
  if (clash && clash.id !== partId) throw new ConflictError(`Part code already used: ${code}`, { code });
  await updatePart(getDb(), partId, { code, name: input.name.trim(), status: input.status });
  return siteMapService(projectId);
}

export async function deletePartService(auth: AuthContext, projectId: string, partId: string) {
  await loadPart(auth, projectId, partId);
  await deletePart(getDb(), partId);
  return siteMapService(projectId);
}

export async function placePartMarkerService(
  auth: AuthContext,
  projectId: string,
  partId: string,
  view: SiteMapView,
  x: number,
  y: number,
) {
  await loadPart(auth, projectId, partId);
  await upsertPartMarker(getDb(), partId, view, x, y);
  return siteMapService(projectId);
}

export async function removePartMarkerService(auth: AuthContext, projectId: string, partId: string, view: SiteMapView) {
  await loadPart(auth, projectId, partId);
  await deletePartMarker(getDb(), partId, view);
  return siteMapService(projectId);
}
