import type { PlanArea, ZoneOption } from "../types/site-plan.types.js";

export function getVisibleMapAreas<T extends Pick<PlanArea, "zone">>(areas: T[], focusedParentId: string | null): T[] {
  return areas.filter((area) =>
    focusedParentId ? area.zone.parentId === focusedParentId : area.zone.parentId === null,
  );
}

export function getZoneMapInteraction(
  zoneId: string,
  zones: Pick<ZoneOption, "id" | "parentId">[],
): "focus" | "inspect" {
  return zones.some((zone) => zone.parentId === zoneId) ? "focus" : "inspect";
}

export function getBlankMapClickAction(
  selectedZoneId: string | null,
  focusedParentId: string | null,
): "clear-selection" | "back-to-overview" | "none" {
  if (selectedZoneId) return "clear-selection";
  return focusedParentId ? "back-to-overview" : "none";
}

export function getActivityFocusAreas<T extends Pick<PlanArea, "zone">>(areas: T[], parentId: string): T[] {
  const children = areas.filter((area) => area.zone.parentId === parentId);
  return children.length > 0 ? children : areas.filter((area) => area.zone.id === parentId);
}

export interface ZoneTreeNode<T extends Pick<ZoneOption, "id" | "parentId">> {
  zone: T;
  children: ZoneTreeNode<T>[];
}

export function buildZoneTree<T extends Pick<ZoneOption, "id" | "parentId">>(zones: T[]): ZoneTreeNode<T>[] {
  const nodes = new Map(zones.map((zone) => [zone.id, { zone, children: [] as ZoneTreeNode<T>[] }]));
  const roots: ZoneTreeNode<T>[] = [];

  for (const node of nodes.values()) {
    const parent = node.zone.parentId ? nodes.get(node.zone.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

export function getZoneDescendantIds(zoneId: string, zones: Pick<ZoneOption, "id" | "parentId">[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const zone of zones) {
    if (!zone.parentId) continue;
    const children = childrenByParent.get(zone.parentId) ?? [];
    children.push(zone.id);
    childrenByParent.set(zone.parentId, children);
  }

  const descendants = new Set<string>();
  const pending = [zoneId];
  for (let index = 0; index < pending.length; index++) {
    for (const childId of childrenByParent.get(pending[index]!) ?? []) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      pending.push(childId);
    }
  }
  return descendants;
}

export function getFocusedMapAreas<T extends Pick<PlanArea, "zone">>(areas: T[], focusedZoneId: string): T[] {
  return areas.filter((area) => area.zone.id === focusedZoneId || area.zone.parentId === focusedZoneId);
}

export function getVisibleConfigurationAreas<T extends Pick<PlanArea, "zone">>(
  areas: T[],
  focusedZoneId: string | null,
): T[] {
  return focusedZoneId ? getFocusedMapAreas(areas, focusedZoneId) : areas.filter((area) => area.zone.parentId === null);
}

export function getActivityZoneOptions<T extends Pick<ZoneOption, "id" | "parentId">>(zones: T[]): T[] {
  const parentIds = new Set(zones.flatMap((zone) => (zone.parentId ? [zone.parentId] : [])));
  return [...zones.filter((zone) => !parentIds.has(zone.id)), ...zones.filter((zone) => parentIds.has(zone.id))];
}

export function getActivityZoneDefaultId(
  zones: Pick<ZoneOption, "id" | "parentId">[],
  preferredZoneId?: string | null,
): string {
  return preferredZoneId && zones.some((zone) => zone.parentId === preferredZoneId) ? "" : (preferredZoneId ?? "");
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
