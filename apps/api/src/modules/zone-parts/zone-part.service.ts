import { getDb } from "@/db/client.js";
import { getProjectById } from "@/modules/projects/project.repository.js";
import { getZoneById, hasZoneChildren } from "@/modules/zones/zone.repository.js";
import { getFacilitiesForLegacyZone } from "@/modules/facilities/facility.repository.js";
import { normalizeZoneColor } from "@/modules/zones/zone.color.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { parseNormalizedPoint } from "@/modules/site-plans/site-plan.geometry.js";
import { createZonePart, listProjectZoneParts, listZoneParts, updateZonePart } from "./zone-part.repository.js";
import type { SaveZonePartInput } from "./zone-part.type.js";

export async function listProjectZonePartsService(projectId: string) {
  const db = getDb();
  if (!(await getProjectById(db, projectId))) throw new NotFoundError("Project not found", { projectId });
  return listProjectZoneParts(db, projectId);
}

export async function saveZonePartsService(projectId: string, zoneId: string, inputs: SaveZonePartInput[]) {
  const db = getDb();
  if (!(await getProjectById(db, projectId))) throw new NotFoundError("Project not found", { projectId });
  const zone = await getZoneById(db, zoneId);
  if (!zone) throw new NotFoundError("Zone not found", { zoneId });
  if (zone.projectId !== projectId) {
    throw new ValidationError("Zone does not belong to this project", { zoneId, projectId });
  }
  if (await hasZoneChildren(db, zoneId)) {
    throw new ValidationError("Work Parts can only be configured for physical Zones", { zoneId });
  }

  const facilities = await getFacilitiesForLegacyZone(db, projectId, zoneId);
  if (facilities.length !== 1 || !facilities[0]!.isActive) {
    throw new ValidationError("Legacy location does not resolve to exactly one active Facility");
  }
  const facilityId = facilities[0]!.id;

  const existing = await listZoneParts(db, zoneId);
  const existingById = new Map(existing.map((part) => [part.id, part]));
  const seenIds = new Set<string>();
  const parsed = inputs.map((input) => {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) throw new ValidationError("Work Part code and name are required");
    if (input.id) {
      if (seenIds.has(input.id)) throw new ValidationError("Work Part appears more than once", { id: input.id });
      if (!existingById.has(input.id))
        throw new NotFoundError("Work Part not found in this Zone", { id: input.id, zoneId });
      const currentOwner = existingById.get(input.id)!.facilityId;
      if (currentOwner && currentOwner !== facilityId)
        throw new ValidationError("Legacy Part conflicts with its Facility ownership");
      seenIds.add(input.id);
    }
    const bothNull = input.mapX === null && input.mapY === null;
    if (!bothNull && (input.mapX == null || input.mapY == null)) {
      throw new ValidationError("Both Part marker coordinates must be supplied together", { id: input.id });
    }
    const point = bothNull ? null : parseNormalizedPoint({ x: input.mapX, y: input.mapY });
    return {
      id: input.id,
      facilityId,
      code,
      name,
      displayColor: normalizeZoneColor(input.displayColor),
      mapX: point?.x ?? null,
      mapY: point?.y ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };
  });

  const finalCodes = new Set<string>();
  const submittedById = new Map(parsed.flatMap((part) => (part.id ? [[part.id, part] as const] : [])));
  const finalParts = existing.map((part) => submittedById.get(part.id) ?? part);
  const newParts = parsed.filter((part) => !part.id);
  for (const part of [...finalParts, ...newParts]) {
    if (finalCodes.has(part.code))
      throw new ValidationError("Work Part code must be unique within its Zone", { code: part.code });
    finalCodes.add(part.code);
  }

  await db.transaction(async (tx) => {
    for (const part of parsed) {
      const { id, ...values } = part;
      if (id) await updateZonePart(tx as never, id, values);
      else await createZonePart(tx as never, zoneId, values);
    }
  });
  return listZoneParts(getDb(), zoneId);
}
