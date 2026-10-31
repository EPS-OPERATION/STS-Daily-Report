import { randomUUID } from "node:crypto";
import { COORDINATION_MAP_MAX_SIDE, isEpsAdmin, type CoordinationMap, type CoordinationMapAdmin } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { imageSize } from "@/shared/image-size.js";
import { getStorage } from "@/shared/storage/index.js";
import { countSectionReportRows, listSections } from "./coordination-section.repository.js";
import { countJobsOnMap, deleteMap, findMapByName, insertMap, listMapsWithCounts, nextMapSortOrder, reorderMaps, updateMap, type MapRow } from "./coordination-map.repository.js";

const MIN_SIDE = 200;
// Browsers refuse to draw a canvas much beyond this, so a bigger file could never be shown.
const MAX_SIDE = 8192;
const MAX_BYTES = 12 * 1024 * 1024;
const THAI = /[฀-๿]/;
const EXTENSION = { png: "png", jpeg: "jpg", webp: "webp" } as const;
// A replacement picture must have the same shape, so the jobs drawn on the map stay where they were.
const ASPECT_TOLERANCE = 0.01;

// Signed storage links last 6 hours and are reused for 5, so the map payload does not ask the storage for a
// new signature on every refresh (on Supabase that is one extra HTTP call per map).
const LINK_SECONDS = 6 * 3600;
const LINK_REUSE_MS = 5 * 3600_000;
const links = new Map<string, { url: string; until: number }>();
async function storageLink(key: string) {
  const hit = links.get(key);
  if (hit && hit.until > Date.now()) return hit.url;
  const url = await getStorage().getPresignedUrl(key, LINK_SECONDS);
  links.set(key, { url, until: Date.now() + LINK_REUSE_MS });
  return url;
}

/** The map as the web app draws it: uploaded maps get a signed link, shipped ones keep their static path. */
export async function toMapDto(row: MapRow): Promise<CoordinationMap> {
  const imagePath = row.objectKey ? await storageLink(row.objectKey).catch(() => "") : row.imagePath;
  return { id: row.id, projectId: row.projectId, imagePath, width: row.width, height: row.height, name: row.name, nameTh: row.nameTh };
}

function assertAdmin(auth: AuthContext) {
  if (!isEpsAdmin(auth.user.role)) throw new ForbiddenError("Only EPS administrators can manage the Map areas");
}
async function assertProject(projectId: string) {
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found");
}
function assertNames(name: string, nameTh: string) {
  if (!name.trim() || !nameTh.trim()) throw new ValidationError("Enter the area name in English and Thai");
  if (THAI.test(name)) throw new ValidationError("The English name must be written in English", { field: "name" });
  if (!THAI.test(nameTh)) throw new ValidationError("The Thai name must be written in Thai", { field: "nameTh" });
}

// Reads the real size from the file itself; the browser already shrank big pictures, but it is checked here too.
async function readPicture(file: File) {
  if (file.size > MAX_BYTES) throw new ValidationError("The picture is larger than 12 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = imageSize(bytes);
  if (!size) throw new ValidationError("Use a PNG, JPG or WebP picture");
  if (Math.min(size.width, size.height) < MIN_SIDE) throw new ValidationError(`The picture is too small (at least ${MIN_SIDE}px on each side)`);
  if (Math.max(size.width, size.height) > MAX_SIDE) throw new ValidationError(`The picture is too large (at most ${MAX_SIDE}px; ${COORDINATION_MAP_MAX_SIDE}px is plenty)`);
  return { bytes, ...size };
}
async function store(projectId: string, picture: Awaited<ReturnType<typeof readPicture>>) {
  const key = `coordination-maps/${projectId}/${randomUUID()}.${EXTENSION[picture.type]}`;
  await getStorage().upload({ key, body: picture.bytes, contentType: `image/${picture.type}` });
  return key;
}
// Orphaned bytes are harmless; a failed remove must not undo the change that was already saved.
const dropFromStorage = (key: string | null) => key ? getStorage().remove(key).catch(() => undefined) : undefined;

export async function listMapsAdminService(auth: AuthContext, projectId: string): Promise<CoordinationMapAdmin[]> {
  assertAdmin(auth);
  await assertProject(projectId);
  const rows = await listMapsWithCounts(getDb(), projectId);
  return Promise.all(rows.map(async ({ map, jobCount, sectionCount }, index) => ({
    ...(await toMapDto(map)), isMain: index === 0, uploaded: Boolean(map.objectKey), jobCount, sectionCount,
  })));
}

export async function createMapService(auth: AuthContext, projectId: string, input: { name: string; nameTh: string; file: File }) {
  assertAdmin(auth);
  await assertProject(projectId);
  const db = getDb();
  const name = input.name.trim(), nameTh = input.nameTh.trim();
  assertNames(name, nameTh);
  if (await findMapByName(db, projectId, name)) throw new ConflictError(`There is already an area called "${name}"`);
  const picture = await readPicture(input.file);
  const key = await store(projectId, picture);
  try {
    const row = await insertMap(db, { projectId, name, nameTh, imagePath: key, objectKey: key, width: picture.width, height: picture.height, sortOrder: await nextMapSortOrder(db, projectId) });
    return toMapDto(row);
  } catch (error) {
    await dropFromStorage(key);
    throw error;
  }
}

export async function updateMapService(auth: AuthContext, projectId: string, id: string, input: { name?: string; nameTh?: string; file?: File }) {
  assertAdmin(auth);
  await assertProject(projectId);
  const db = getDb();
  const current = (await listMapsWithCounts(db, projectId)).find((r) => r.map.id === id)?.map;
  if (!current) throw new NotFoundError("Area not found");
  const name = (input.name ?? current.name).trim(), nameTh = (input.nameTh ?? current.nameTh).trim();
  assertNames(name, nameTh);
  if (name.toLowerCase() !== current.name.toLowerCase() && await findMapByName(db, projectId, name, id)) throw new ConflictError(`There is already an area called "${name}"`);
  let replaced: { key: string; width: number; height: number } | null = null;
  if (input.file) {
    const picture = await readPicture(input.file);
    if (Math.abs(picture.width / picture.height - current.width / current.height) > ASPECT_TOLERANCE * (current.width / current.height)) {
      throw new ValidationError("The new picture must have the same shape as the current one, so the jobs stay where they are drawn");
    }
    replaced = { key: await store(projectId, picture), width: picture.width, height: picture.height };
  }
  const row = await updateMap(db, projectId, id, {
    name, nameTh,
    ...(replaced ? { imagePath: replaced.key, objectKey: replaced.key, width: replaced.width, height: replaced.height } : {}),
  });
  if (!row) throw new NotFoundError("Area not found");
  if (replaced) await dropFromStorage(current.objectKey);
  return toMapDto(row);
}

// The first map stays first (it is the default area and the one the road register is drawn on); only the others move.
export async function reorderMapsService(auth: AuthContext, projectId: string, ids: string[]) {
  assertAdmin(auth);
  await assertProject(projectId);
  const db = getDb();
  const current = (await listMapsWithCounts(db, projectId)).map((r) => r.map.id);
  if (ids.length !== current.length || new Set(ids).size !== ids.length || !ids.every((id) => current.includes(id))) {
    throw new ValidationError("The list must contain every area exactly once");
  }
  if (ids[0] !== current[0]) throw new ValidationError("The main area stays first");
  await reorderMaps(db, projectId, ids);
}

export async function deleteMapService(auth: AuthContext, projectId: string, id: string) {
  assertAdmin(auth);
  await assertProject(projectId);
  const db = getDb();
  const rows = await listMapsWithCounts(db, projectId);
  const row = rows.find((r) => r.map.id === id);
  if (!row) throw new NotFoundError("Area not found");
  if (rows[0]!.map.id === id) throw new ConflictError("The main area cannot be deleted");
  const jobs = await countJobsOnMap(db, id);
  if (jobs > 0) throw new ConflictError(`${jobs} job${jobs === 1 ? " is" : "s are"} drawn on this area, so it cannot be deleted`, { jobs });
  const sections = (await listSections(db, projectId)).filter((s) => s.mapId === id);
  const used = (await Promise.all(sections.map((s) => countSectionReportRows(db, s.id)))).reduce((a, b) => a + b, 0);
  if (used > 0) throw new ConflictError(`Daily reports name this area's route sections (${used} row${used === 1 ? "" : "s"}), so it cannot be deleted`, { used });
  await deleteMap(db, projectId, id);
  await dropFromStorage(row.map.objectKey);
}
