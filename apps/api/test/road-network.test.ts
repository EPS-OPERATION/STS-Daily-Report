import { describe, expect, it } from "bun:test";
import { buildRoadNetwork, directionWord, roadStopsOf, roadsJoining, routeAlongRoads, routeThrough, snapRoadPoint, snapToRoad } from "@sts/shared";

// A plain grid like the site: North road across the top, West and Boiler roads down from it, South across the bottom.
const size = { width: 1000, height: 1000 };
const roads = [
  { id: "H1", name: "NORTH", points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }] },
  { id: "H2", name: "SOUTH", points: [{ x: 0.1, y: 0.9 }, { x: 0.9, y: 0.9 }] },
  { id: "V1", name: "WEST", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.9 }] },
  { id: "V2", name: "BOILER", points: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.9 }] },
];
const net = buildRoadNetwork(roads, size);
const tap = (x: number, y: number) => snapToRoad(net, { x, y })!;

describe("road network from whole roads", () => {
  it("finds the junctions where roads meet", () => {
    expect(net.nodes.length).toBe(6); // 4 corners + Boiler meets North and South
    expect(net.edges.length).toBe(6); // North and South split at Boiler; West and Boiler stay whole
  });

  it("cuts a stretch of one road between two taps", () => {
    const r = routeThrough(net, [tap(0.2, 0.11), tap(0.35, 0.09)])!;
    expect(r.roadIds).toEqual(["H1"]);
    expect(r.points[0]!.x).toBeCloseTo(0.2);
    expect(r.points[r.points.length - 1]!.x).toBeCloseTo(0.35);
    expect(r.length).toBeCloseTo(150, 0);
  });

  it("turns at a junction onto the next road", () => {
    const r = routeThrough(net, [tap(0.3, 0.1), tap(0.5, 0.4)])!;
    expect(r.roadIds).toEqual(["H1", "V2"]);
    expect(r.length).toBeCloseTo(200 + 300, 0); // 0.3→0.5 along North, then 0.1→0.4 down Boiler
  });

  it("ignores taps far from any road", () => {
    expect(snapToRoad(net, { x: 0.3, y: 0.5 })).toBeNull();
  });
});

describe("roads picked from a list, in driving order", () => {
  it("one road = the whole road", () => {
    const r = routeAlongRoads(net, ["V2"])!;
    expect(r.roadIds).toEqual(["V2"]);
    expect(r.length).toBeCloseTo(800, 0);
  });

  it("North then Boiler: along North from its far end to the junction, then down Boiler", () => {
    const r = routeAlongRoads(net, ["H1", "V2"])!;
    expect(r.roadIds).toEqual(["H1", "V2"]);
    expect([0.1, 0.9].some((x) => Math.abs(r.points[0]!.x - x) < 1e-6)).toBe(true); // an end of North (Boiler joins it mid-way)
    expect(r.points[r.points.length - 1]!.y).toBeCloseTo(0.9); // bottom of Boiler
    expect(r.length).toBeCloseTo(400 + 800, 0);
  });
});

describe("drawing magnet", () => {
  it("snaps a tap near another road's end onto that end, and near a line onto the line", () => {
    expect(snapRoadPoint(roads, { x: 0.905, y: 0.105 }, size)).toEqual({ x: 0.9, y: 0.1 });
    const onLine = snapRoadPoint(roads, { x: 0.3, y: 0.108 }, size);
    expect(onLine.y).toBeCloseTo(0.1);
    expect(snapRoadPoint(roads, { x: 0.3, y: 0.5 }, size)).toEqual({ x: 0.3, y: 0.5 });
  });
});

describe("picked roads that don't meet", () => {
  it("adds the roads in between (West then Boiler goes along North or South)", () => {
    const r = routeAlongRoads(net, ["V1", "V2"])!;
    expect(r.roadIds[0]).toBe("V1");
    expect(r.roadIds[r.roadIds.length - 1]).toBe("V2");
    expect(r.roadIds.some((id) => id === "H1" || id === "H2")).toBe(true);
  });

  it("returns null when a road can't be reached", () => {
    const island = buildRoadNetwork([...roads, { id: "X", name: "ISLAND", points: [{ x: 0.7, y: 0.4 }, { x: 0.8, y: 0.5 }] }], size);
    expect(routeAlongRoads(island, ["V1", "X"])).toBeNull();
  });
});

describe("ways between two roads that don't meet", () => {
  it("West and Boiler can be joined by North or South", () => {
    expect(roadsJoining(net, "V1", "V2").sort()).toEqual(["H1", "H2"]);
    expect(roadsJoining(net, "H1", "V2")).toEqual([]); // they meet already
  });
});

describe("choosing where to start and stop", () => {
  it("lists the stopping places along a road in order", () => {
    const stops = roadStopsOf(net, "H2"); // South: west corner, Boiler junction, east end
    expect(stops.length).toBe(3);
    expect(stops.map((s) => s.isEnd)).toEqual([true, false, true]);
    expect(stops[1]!.crossing).toEqual(["V2"]);
  });

  it("Boiler then South, finishing on the left (west) instead of the far end", () => {
    const west = roadStopsOf(net, "H2").find((s) => s.point.x < 0.2)!;
    const r = routeAlongRoads(net, ["V2", "H2"], { end: west.node })!;
    expect(r.points[r.points.length - 1]!.x).toBeCloseTo(0.1);
    expect(directionWord(net, { x: 0.5, y: 0.9 }, west.point)).toBe("ซ้าย");
  });
});
