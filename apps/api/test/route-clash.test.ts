import { describe, expect, it } from "bun:test";
import { coordinationGeometryError, coordinationRouteClashes, roadPlacesMeet, routeDistance } from "@sts/shared";

const route = (id: string, contractorId: string, points: [number, number][], workDate = "2026-10-15") => ({
  id, contractorId, workDate, areaKind: "route" as const,
  geometry: { type: "polyline" as const, points: points.map(([x, y]) => ({ x, y })) },
});

describe("road route geometry", () => {
  it("accepts an open line of two or more points", () => {
    expect(coordinationGeometryError({ type: "polyline", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }] })).toBeNull();
  });
  it("rejects one point, repeated points and points off the drawing", () => {
    expect(coordinationGeometryError({ type: "polyline", points: [{ x: 0.1, y: 0.1 }] })).not.toBeNull();
    expect(coordinationGeometryError({ type: "polyline", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.1 }] })).not.toBeNull();
    expect(coordinationGeometryError({ type: "polyline", points: [{ x: 0.1, y: 0.1 }, { x: 1.5, y: 0.1 }] })).not.toBeNull();
  });
});

describe("road route clashes", () => {
  const W = 1000, H = 1000;
  it("measures crossing lines as zero apart", () => {
    expect(routeDistance([{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }], W, H)).toBe(0);
  });
  it("flags two contractors on the same stretch, both ways", () => {
    const clashes = coordinationRouteClashes([route("a", "LCE", [[0.1, 0.5], [0.9, 0.5]]), route("b", "ZCE", [[0.2, 0.52], [0.8, 0.52]])], W, H);
    expect(clashes.get("a")).toEqual(["ZCE"]);
    expect(clashes.get("b")).toEqual(["LCE"]);
  });
  it("ignores far-apart routes, the same contractor and other days", () => {
    expect(coordinationRouteClashes([route("a", "LCE", [[0.1, 0.1], [0.9, 0.1]]), route("b", "ZCE", [[0.1, 0.9], [0.9, 0.9]])], W, H).size).toBe(0);
    expect(coordinationRouteClashes([route("a", "LCE", [[0.1, 0.5], [0.9, 0.5]]), route("b", "LCE", [[0.5, 0], [0.5, 1]])], W, H).size).toBe(0);
    expect(coordinationRouteClashes([route("a", "LCE", [[0.1, 0.5], [0.9, 0.5]]), route("b", "ZCE", [[0.5, 0], [0.5, 1]], "2026-10-16")], W, H).size).toBe(0);
  });
});

describe("road request place rule", () => {
  const line = (pts: [number, number][]) => pts.map(([x, y]) => ({ x, y }));
  it("register segments clash only when a segment is shared", () => {
    expect(roadPlacesMeet({ roadLocation: "a", segmentIds: ["s1", "s2"] }, { roadLocation: "b", segmentIds: ["s2"] })).toBe(true);
    expect(roadPlacesMeet({ roadLocation: "a", segmentIds: ["s1"] }, { roadLocation: "a", segmentIds: ["s3"] })).toBe(false);
  });
  it("drawn lines clash when they cross or run together", () => {
    expect(roadPlacesMeet({ roadLocation: "t", route: line([[0.6, 0.4], [0.6, 0.6]]) }, { roadLocation: "r", route: line([[0.3, 0.5], [0.7, 0.5]]) })).toBe(true);
    expect(roadPlacesMeet({ roadLocation: "t", route: line([[0.1, 0.1], [0.2, 0.1]]) }, { roadLocation: "r", route: line([[0.3, 0.5], [0.7, 0.5]]) })).toBe(false);
  });
  it("older requests without a place fall back to the road name", () => {
    expect(roadPlacesMeet({ roadLocation: "Road  R2" }, { roadLocation: "road r2" })).toBe(true);
    expect(roadPlacesMeet({ roadLocation: "R2" }, { roadLocation: "R3" })).toBe(false);
  });
});
