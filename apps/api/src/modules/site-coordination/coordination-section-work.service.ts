import { coordinationDateValid, isEpsStaff, type CoordinationSectionCatalog, type CoordinationSectionWork } from "@sts/shared";
import { listActiveContractorsForUser } from "@/auth/auth.repository.js";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getMap, getMapById, listMaps } from "./coordination.repository.js";
import { toMapDto } from "./coordination-map.service.js";
import { listSectionActivities, listSectionForecasts } from "./coordination-section-work.repository.js";
import { listSections } from "./coordination-section.repository.js";

// Everyone on the project (EPS staff, or a contractor with a membership here).
async function memberAccess(auth: AuthContext, projectId: string) {
  const db = getDb();
  const [project, memberships] = await Promise.all([getProjectById(db, projectId), listActiveContractorsForUser(db, auth.user.id, projectId)]);
  if (!project) throw new NotFoundError("Project not found");
  if (!isEpsStaff(auth.user.role) && !memberships.length) throw new ForbiddenError("You cannot access this project");
  return memberships;
}

// Route sections as places for the daily report form ("Where" of a Today Activity / extra work / forecast row):
// the areas that have sections, with their picture for the form's mini map, and the sections in map order.
export async function sectionLocationsService(auth: AuthContext, projectId: string): Promise<CoordinationSectionCatalog> {
  await memberAccess(auth, projectId);
  const db = getDb();
  const [maps, sections] = await Promise.all([listMaps(db, projectId), listSections(db, projectId)]);
  const used = maps.filter((m) => sections.some((s) => s.mapId === m.id));
  return { maps: await Promise.all(used.map(toMapDto)), sections: used.flatMap((m) => sections.filter((s) => s.mapId === m.id)) };
}

// The Map's route-section card: what each contractor reported for a stretch on `date` (Today Activity and
// afternoon extra work, with plan/actual %) and what was planned for it in the previous evening's Tomorrow
// Forecast. Everyone on the project sees who works where and on what; headcount only EPS and the company itself.
// Loaded on its own (not in the 20 s map polling): the reports change a few times a day, the map every minute.
export async function sectionWorkService(auth: AuthContext, projectId: string, date: string, mapId?: string): Promise<CoordinationSectionWork> {
  const db = getDb();
  const memberships = await memberAccess(auth, projectId);
  const eps = isEpsStaff(auth.user.role);
  if (!coordinationDateValid(date)) throw new ValidationError("Invalid work date");
  const map = mapId ? await getMapById(db, projectId, mapId) : await getMap(db, projectId);
  if (!map) throw new NotFoundError("Map not found");
  const sectionIds = (await listSections(db, projectId)).filter((s) => s.mapId === map.id).map((s) => s.id);
  const [activities, planned] = await Promise.all([
    listSectionActivities(db, projectId, date, sectionIds),
    listSectionForecasts(db, projectId, date, sectionIds),
  ]);
  const own = new Set(memberships.map((m) => m.id));
  return {
    date,
    mapId: map.id,
    activities: activities.map((a) => ({
      ...a,
      sectionId: a.sectionId!,
      headcount: eps || own.has(a.contractorId) ? a.headcount : null,
    })),
    planned: planned.map((f) => ({ ...f, sectionId: f.sectionId! })),
  };
}
