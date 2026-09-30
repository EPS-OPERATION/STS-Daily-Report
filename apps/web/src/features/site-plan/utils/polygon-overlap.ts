// Framework-free WBS-aware polygon overlap detection.
//
// WBS hierarchy (zones.parent_id) decides what an intersection MEANS — never
// raw geometry alone:
//   parent/descendant  -> expected nesting, never reported
//   sibling/sibling    -> possible misconfiguration, warning
//   different branches -> unrelated physical areas, strong warning
// Overlap significance is measured against the SMALLER polygon so a tiny
// sliver on a huge zone does not raise false alarms. Boolean intersection
// math is delegated to the maintained `polygon-clipping` library.

import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Pair } from "polygon-clipping";

const { intersection } = polygonClipping;

export interface OverlapPoint {
  x: number;
  y: number;
}

export interface OverlapSubject {
  zoneId: string;
  points: OverlapPoint[];
}

export interface OverlapZone {
  id: string;
  parentId: string | null;
}

export type OverlapRelationship = "parent-descendant" | "sibling" | "different-branch";

export type OverlapSeverity = "warning" | "strong";

export interface ZoneOverlap {
  zoneAId: string;
  zoneBId: string;
  /** Absolute intersection area in the input's square units. */
  intersectionArea: number;
  /** intersectionArea / min(areaA, areaB), 0..1. */
  overlapRatio: number;
  relationship: OverlapRelationship;
  severity: OverlapSeverity;
  /** Largest intersection ring in input coordinates (visualization only, never saved). */
  intersectionPoints: OverlapPoint[];
}

/** Minimum overlapRatio (vs the smaller polygon) that counts as meaningful. */
export const MEANINGFUL_OVERLAP_RATIO = 0.05;

/**
 * Physical leaf zones: zones with no children. Logical group nodes never
 * represent physical geometry, so overlap analysis and physical mapping
 * counts operate on leaves only.
 */
export function getLeafZoneIds(zones: readonly OverlapZone[]): Set<string> {
  const parents = new Set<string>();
  for (const zone of zones) {
    if (zone.parentId !== null) parents.add(zone.parentId);
  }
  return new Set(zones.filter((zone) => !parents.has(zone.id)).map((zone) => zone.id));
}

export function polygonArea(points: readonly OverlapPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum) / 2;
}

function toClosedRing(points: readonly OverlapPoint[]): Pair[] {
  const ring: Pair[] = points.map((p) => [p.x, p.y]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

function ringArea(points: readonly Pair[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    sum += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(sum) / 2;
}

function intersectionOf(
  a: readonly OverlapPoint[],
  b: readonly OverlapPoint[],
): {
  area: number;
  largestRing: OverlapPoint[];
} {
  const result: MultiPolygon = intersection([toClosedRing(a)], [toClosedRing(b)]);
  let area = 0;
  let largestRing: OverlapPoint[] = [];
  let largestArea = 0;
  for (const polygon of result) {
    polygon.forEach((ring, index) => {
      const ringSize = ringArea(ring);
      if (index === 0) {
        area += ringSize;
        if (ringSize > largestArea) {
          largestArea = ringSize;
          largestRing = ring.map(([x, y]) => ({ x, y }));
        }
      } else {
        area -= ringSize;
      }
    });
  }
  return { area: Math.max(0, area), largestRing };
}

function boundsOf(points: readonly OverlapPoint[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}

function boundsTouch(
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
}

export function isAncestor(
  ancestorId: string,
  descendantId: string,
  parentOf: ReadonlyMap<string, string | null>,
): boolean {
  const seen = new Set<string>();
  let current = parentOf.get(descendantId) ?? null;
  while (current !== null && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

export function classifyZonePair(
  aId: string,
  bId: string,
  parentOf: ReadonlyMap<string, string | null>,
): OverlapRelationship {
  if (isAncestor(aId, bId, parentOf) || isAncestor(bId, aId, parentOf)) return "parent-descendant";
  const parentA = parentOf.get(aId) ?? null;
  const parentB = parentOf.get(bId) ?? null;
  // Roots (parentId null) belong to no shared group: root-vs-root and
  // cross-branch pairs are all "different branches".
  if (parentA !== null && parentA === parentB) return "sibling";
  return "different-branch";
}

export function findZoneOverlaps(
  areas: readonly OverlapSubject[],
  zones: readonly OverlapZone[],
  threshold: number = MEANINGFUL_OVERLAP_RATIO,
): ZoneOverlap[] {
  const parentOf = new Map(zones.map((zone) => [zone.id, zone.parentId]));
  const overlaps: ZoneOverlap[] = [];
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const a = areas[i]!;
      const b = areas[j]!;
      if (a.zoneId === b.zoneId || a.points.length < 3 || b.points.length < 3) continue;
      const minArea = Math.min(polygonArea(a.points), polygonArea(b.points));
      if (!(minArea > 0)) continue;
      // Cheap reject before boolean math (also kills most edge touches).
      if (!boundsTouch(boundsOf(a.points), boundsOf(b.points))) continue;
      const relationship = classifyZonePair(a.zoneId, b.zoneId, parentOf);
      if (relationship === "parent-descendant") continue;
      let area: number;
      let largestRing: OverlapPoint[];
      try {
        ({ area, largestRing } = intersectionOf(a.points, b.points));
      } catch {
        continue;
      }
      const overlapRatio = area / minArea;
      if (!(overlapRatio >= threshold)) continue;
      overlaps.push({
        zoneAId: a.zoneId,
        zoneBId: b.zoneId,
        intersectionArea: area,
        overlapRatio,
        relationship,
        severity: relationship === "sibling" ? "warning" : "strong",
        intersectionPoints: largestRing,
      });
    }
  }
  const severityRank = (severity: OverlapSeverity): number => (severity === "strong" ? 0 : 1);
  overlaps.sort((x, y) => severityRank(x.severity) - severityRank(y.severity) || y.overlapRatio - x.overlapRatio);
  return overlaps;
}
