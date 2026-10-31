import { isEpsStaff, routeGeometryError, type CoordinationSection } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getMapById } from "./coordination.repository.js";
import { countSectionReportRows, deleteSection, findSectionByCode, getSection, insertSection, nextSectionSortOrder, updateSection, type SectionInput } from "./coordination-section.repository.js";

async function assertEps(auth: AuthContext, projectId: string) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can change the route sections");
  if (!(await getProjectById(getDb(), projectId))) throw new NotFoundError("Project not found");
}

function clean(raw: SectionInput): SectionInput {
  const code = raw.code.trim(), work = raw.work.trim();
  if (!code || !work) throw new ValidationError("Enter the section code and the work it covers");
  const error = routeGeometryError(raw.points);
  if (error) throw new ValidationError(error);
  return { code, work, color: raw.color.toUpperCase(), points: raw.points };
}

export async function saveSectionService(auth: AuthContext, projectId: string, raw: SectionInput & { mapId?: string }, id?: string): Promise<CoordinationSection> {
  await assertEps(auth, projectId);
  const db = getDb();
  const input = clean(raw);
  // A section stays on the map it was drawn on; only new ones choose.
  const existing = id ? await getSection(db, projectId, id) : null;
  if (id && !existing) throw new NotFoundError("Section not found");
  const mapId = existing?.mapId ?? raw.mapId;
  if (!mapId || !(await getMapById(db, projectId, mapId))) throw new ValidationError("Choose the map this section is drawn on");
  if (await findSectionByCode(db, mapId, input.code, id)) throw new ConflictError(`Section "${input.code}" already exists on this map`);
  if (!existing) return insertSection(db, projectId, mapId, input, await nextSectionSortOrder(db, mapId), auth.user.id);
  const row = await updateSection(db, projectId, id!, input, auth.user.id);
  if (!row) throw new NotFoundError("Section not found");
  return row;
}

// Jobs linked to the section keep existing; they just lose the link (FK set null).
export async function deleteSectionService(auth: AuthContext, projectId: string, id: string) {
  await assertEps(auth, projectId);
  if (!(await getSection(getDb(), projectId, id))) throw new NotFoundError("Section not found");
  // Daily reports name the section as where the work was: it stays so their history keeps its place.
  const used = await countSectionReportRows(getDb(), id);
  if (used > 0) throw new ConflictError(`${used} daily report row${used === 1 ? " uses" : "s use"} this section, so it cannot be deleted — edit it instead`, { used });
  await deleteSection(getDb(), projectId, id);
}
