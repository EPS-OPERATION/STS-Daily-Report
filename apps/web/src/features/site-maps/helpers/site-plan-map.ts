import type { ZoneOption } from "@/features/site-maps/types/site-plan.types.js";

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
  const children = new Map<string, string[]>();
  for (const zone of zones) {
    if (!zone.parentId) continue;
    const siblings = children.get(zone.parentId) ?? [];
    siblings.push(zone.id);
    children.set(zone.parentId, siblings);
  }
  const descendants = new Set<string>();
  const pending = [zoneId];
  for (let index = 0; index < pending.length; index++) {
    for (const childId of children.get(pending[index]!) ?? []) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      pending.push(childId);
    }
  }
  return descendants;
}

export function getZoneDescendantPoints<T extends { zoneId: string }>(
  zoneId: string,
  zones: Pick<ZoneOption, "id" | "parentId">[],
  points: T[],
): T[] {
  const descendants = getZoneDescendantIds(zoneId, zones);
  return points.filter((point) => descendants.has(point.zoneId));
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
    if (!zone.parentId) continue;
    const siblings = children.get(zone.parentId) ?? [];
    siblings.push(zone.id);
    children.set(zone.parentId, siblings);
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
