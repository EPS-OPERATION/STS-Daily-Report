import type { PlanArea, ZoneOption } from "../types/site-plan.types.js";

export function getVisibleMapAreas<T extends Pick<PlanArea, "zone">>(areas: T[], focusedParentId: string | null): T[] {
  return areas.filter((area) =>
    focusedParentId ? area.zone.parentId === focusedParentId : area.zone.parentId === null,
  );
}

export function getZoneSubtreeActivities<T>(
  zoneId: string,
  zones: Pick<ZoneOption, "id" | "parentId">[],
  byZone: ReadonlyMap<string, T[]>,
): T[] {
  const children = new Map<string, string[]>();
  for (const zone of zones) {
    if (zone.parentId) {
      const siblings = children.get(zone.parentId) ?? [];
      siblings.push(zone.id);
      children.set(zone.parentId, siblings);
    }
  }

  const activities: T[] = [];
  const visited = new Set<string>();
  const pending = [zoneId];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    activities.push(...(byZone.get(current) ?? []));
    pending.push(...(children.get(current) ?? []));
  }
  return activities;
}
