import { describe, expect, it } from "bun:test";
import {
  classifyZonePair,
  findZoneOverlaps,
  getLeafZoneIds,
  isAncestor,
  MEANINGFUL_OVERLAP_RATIO,
  polygonArea,
  type OverlapSubject,
  type OverlapZone,
} from "../apps/web/src/features/site-plan/utils/polygon-overlap.js";

const box = (x0: number, y0: number, x1: number, y1: number): OverlapSubject["points"] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

const zones: OverlapZone[] = [
  { id: "r1", parentId: null },
  { id: "r2", parentId: null },
  { id: "a", parentId: "r1" },
  { id: "b", parentId: "r1" },
  { id: "c", parentId: "r2" },
];

const subject = (zoneId: string, points: OverlapSubject["points"]): OverlapSubject => ({ zoneId, points });

describe("polygonArea", () => {
  it("measures a unit square as 1", () => {
    expect(polygonArea(box(0, 0, 1, 1))).toBeCloseTo(1, 9);
  });
});

describe("isAncestor / classifyZonePair", () => {
  const parentOf = new Map(zones.map((zone) => [zone.id, zone.parentId]));

  it("detects direct and transitive ancestry with cycle guard", () => {
    expect(isAncestor("r1", "a", parentOf)).toBe(true);
    expect(isAncestor("a", "r1", parentOf)).toBe(false);
    expect(isAncestor("a", "b", parentOf)).toBe(false);
  });

  it("classifies parent-descendant, sibling, and cross-branch pairs", () => {
    expect(classifyZonePair("r1", "a", parentOf)).toBe("parent-descendant");
    expect(classifyZonePair("a", "b", parentOf)).toBe("sibling");
    expect(classifyZonePair("a", "c", parentOf)).toBe("different-branch");
    // Roots share no group: root-vs-root is a different-branch pair (CASE C).
    expect(classifyZonePair("r1", "r2", parentOf)).toBe("different-branch");
  });
});

describe("getLeafZoneIds", () => {
  it("treats only childless zones as physical leaves", () => {
    expect([...getLeafZoneIds(zones)].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("findZoneOverlaps", () => {
  it("never reports parent/descendant nesting", () => {
    const overlaps = findZoneOverlaps([subject("r1", box(0, 0, 10, 10)), subject("a", box(1, 1, 3, 3))], zones);
    expect(overlaps).toEqual([]);
  });

  it("warns on meaningful sibling overlap with ratio against the smaller polygon", () => {
    const overlaps = findZoneOverlaps([subject("a", box(0, 0, 4, 4)), subject("b", box(2, 2, 6, 6))], zones);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]!.relationship).toBe("sibling");
    expect(overlaps[0]!.severity).toBe("warning");
    // Intersection 2x2=4, smaller area 16 -> 0.25.
    expect(overlaps[0]!.overlapRatio).toBeCloseTo(0.25, 9);
    expect(overlaps[0]!.intersectionPoints.length).toBeGreaterThan(0);
  });

  it("escalates cross-branch overlap to a strong warning", () => {
    const overlaps = findZoneOverlaps([subject("a", box(0, 0, 4, 4)), subject("c", box(2, 2, 6, 6))], zones);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]!.severity).toBe("strong");
  });

  it("ignores disjoint polygons and insignificant edge contact", () => {
    const overlaps = findZoneOverlaps(
      [subject("a", box(0, 0, 4, 4)), subject("b", box(10, 10, 14, 14)), subject("c", box(4, 0, 8, 4))],
      zones,
    );
    expect(overlaps).toEqual([]);
  });

  it("ignores slivers below the meaningful threshold", () => {
    // 0.1-wide sliver on a 4x4 box: ratio 0.025 < default 0.05.
    const overlaps = findZoneOverlaps([subject("a", box(0, 0, 4, 4)), subject("b", box(3.9, 0, 7.9, 4))], zones);
    expect(MEANINGFUL_OVERLAP_RATIO).toBe(0.05);
    expect(overlaps).toEqual([]);
  });

  it("sorts strong warnings before sibling warnings", () => {
    const overlaps = findZoneOverlaps(
      [subject("a", box(0, 0, 4, 4)), subject("b", box(2, 2, 6, 6)), subject("c", box(1, 1, 5, 5))],
      zones,
    );
    expect(overlaps.map((o) => o.severity)).toEqual(["strong", "strong", "warning"]);
  });
});
