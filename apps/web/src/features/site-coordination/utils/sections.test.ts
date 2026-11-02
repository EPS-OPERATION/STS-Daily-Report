import { describe, expect, it } from "bun:test";
import { nextSectionCode, nextSectionColor, placeCallouts, placeSectionLabels, summariseSectionWork, SECTION_COLORS, sectionEnds, sectionMarkers, snapToSectionEnd } from "./sections.js";

const line = (code: string, ...pts: [number, number][]) => ({ id: code, code, points: pts.map(([x, y]) => ({ x, y })) });

describe("sectionEnds", () => {
  it("reads the two ends of a range code", () => {
    expect(sectionEnds("A-B")).toEqual(["A", "B"]);
    expect(sectionEnds(" e – f ")).toEqual(["E", "F"]);
    expect(sectionEnds("T1-T2")).toEqual(["T1", "T2"]);
  });
  it("has no ends for other codes", () => {
    expect(sectionEnds("North side")).toBeNull();
    expect(sectionEnds("S1")).toBeNull();
    expect(sectionEnds("A-B-C")).toBeNull();
  });
});

describe("nextSectionCode", () => {
  it("continues the alphabet from the last range", () => {
    expect(nextSectionCode(["A-B", "B-C"])).toBe("C-D");
  });
  it("falls back to S<n> for anything else", () => {
    expect(nextSectionCode([])).toBe("A-B");
    expect(nextSectionCode(["Gate", "S2"])).toBe("S3");
    expect(nextSectionCode(["Y-Z"])).toBe("S2");
  });
});

describe("nextSectionColor", () => {
  it("takes the first colour that is not used", () => {
    expect(nextSectionColor([])).toBe(SECTION_COLORS[0]);
    expect(nextSectionColor([SECTION_COLORS[0].toLowerCase(), SECTION_COLORS[1]])).toBe(SECTION_COLORS[2]);
  });
  it("starts over when every colour is used", () => {
    expect(nextSectionColor([...SECTION_COLORS])).toBe(SECTION_COLORS[0]);
  });
});

describe("sectionMarkers", () => {
  it("puts one marker per letter where sections meet", () => {
    const markers = sectionMarkers([line("A-B", [0.1, 0.1], [0.2, 0.2]), line("B-C", [0.2, 0.2], [0.4, 0.2]), line("Gate", [0.5, 0.5], [0.6, 0.6])]);
    expect(markers.map((m) => m.label)).toEqual(["A", "B", "C"]);
    expect(markers[1]!.point).toEqual({ x: 0.2, y: 0.2 });
  });
  it("letters a line drawn backwards by the end that touches its neighbour", () => {
    // A-B tapped from B to A; B-C starts at B.
    const markers = sectionMarkers([line("A-B", [0.2, 0.2], [0.1, 0.1]), line("B-C", [0.2, 0.2], [0.4, 0.2])]);
    expect(Object.fromEntries(markers.map((m) => [m.label, m.point]))).toEqual({ A: { x: 0.1, y: 0.1 }, B: { x: 0.2, y: 0.2 }, C: { x: 0.4, y: 0.2 } });
  });
});

describe("snapToSectionEnd", () => {
  const size = { width: 1000, height: 1000 };
  const all = [line("A-B", [0.1, 0.1], [0.5, 0.5])];
  it("lands on a nearby end", () => {
    expect(snapToSectionEnd(all, { x: 0.505, y: 0.5 }, size, 10)).toEqual({ x: 0.5, y: 0.5 });
  });
  it("leaves a far point alone, and ignores the section being edited", () => {
    expect(snapToSectionEnd(all, { x: 0.7, y: 0.7 }, size, 10)).toEqual({ x: 0.7, y: 0.7 });
    expect(snapToSectionEnd(all, { x: 0.505, y: 0.5 }, size, 10, "A-B")).toEqual({ x: 0.505, y: 0.5 });
  });
});

describe("placeSectionLabels", () => {
  const size = { width: 1000, height: 1000 };
  it("puts letters to the right of their point on a leader", () => {
    const [a] = placeSectionLabels([{ label: "A", point: { x: 0.5, y: 0.5 } }], size, 60, 15);
    expect(a).toMatchObject({ label: "A", dx: 60 });
    expect(Math.abs(a!.dy)).toBeLessThan(1e-9);
  });
  it("moves a letter that would overlap its neighbour or leave the drawing", () => {
    const [e, f] = placeSectionLabels([{ label: "E", point: { x: 0.5, y: 0.5 } }, { label: "F", point: { x: 0.5, y: 0.51 } }], size, 60, 15);
    expect(Math.hypot(e!.dx - f!.dx, e!.dy + 10 - f!.dy)).toBeGreaterThanOrEqual(34);
    const [edge] = placeSectionLabels([{ label: "Z", point: { x: 0.99, y: 0.5 } }], size, 60, 15);
    expect(edge!.dx).toBeLessThan(0);
  });
  it("keeps a letter off a route line", () => {
    // H at the left end of a horizontal stretch: right would sit on the line, so it goes elsewhere.
    const [h] = placeSectionLabels([{ label: "H", point: { x: 0.1, y: 0.5 } }], size, 60, 15, [[{ x: 0.1, y: 0.5 }, { x: 0.6, y: 0.5 }]]);
    expect(Math.abs(h!.dy) > 20 || h!.dx < 0).toBe(true);
  });
});

describe("summariseSectionWork", () => {
  const colorOf = (id: string) => ({ a: "#111111", b: "#222222" } as Record<string, string>)[id];
  it("one row per contractor with the people added up", () => {
    const r = summariseSectionWork(
      [{ contractorId: "b", contractorCode: "ME", headcount: 4, work: "เดินสาย" }, { contractorId: "a", contractorCode: "LT", headcount: 2, work: "ติดตั้ง" }, { contractorId: "a", contractorCode: "LT", headcount: 3 }],
      [], colorOf, "#999999",
    );
    expect(r!.rows).toEqual([{ contractorId: "a", code: "LT", color: "#111111", people: 5, work: "ติดตั้ง" }, { contractorId: "b", code: "ME", color: "#222222", people: 4, work: "เดินสาย" }]);
    expect(r).toMatchObject({ total: 9, more: 0, plan: false });
  });
  it("no total when a contractor's number is hidden from this viewer", () => {
    const r = summariseSectionWork([{ contractorId: "a", contractorCode: "LT", headcount: 2 }, { contractorId: "b", contractorCode: "ME", headcount: null }], [], colorOf, "#999999");
    expect(r!.rows.map((x) => x.people)).toEqual([2, null]);
    expect(r!.total).toBeNull();
  });
  it("keeps three rows and counts the rest", () => {
    const acts = ["A", "B", "C", "D", "E"].map((c) => ({ contractorId: c, contractorCode: c, headcount: 1 }));
    const r = summariseSectionWork(acts, [], colorOf, "#999999");
    expect(r!.rows).toHaveLength(3);
    expect(r).toMatchObject({ more: 2, total: 5 });
  });
  it("falls back to yesterday's forecast (no people) and to nothing", () => {
    const r = summariseSectionWork([], [{ contractorId: "a", contractorCode: "LT" }, { contractorId: "a", contractorCode: "LT" }], colorOf, "#999999");
    expect(r).toMatchObject({ plan: true, total: null, rows: [{ code: "LT", people: null }] });
    expect(summariseSectionWork([], [], colorOf, "#999999")).toBeNull();
  });
});

describe("placeCallouts", () => {
  const size = { width: 1000, height: 1000 };
  const box = (id: string, x: number, y: number) => ({ id, anchor: { x, y }, w: 120, h: 50 });
  const hits = (c: { cx: number; cy: number }, b: { w: number; h: number }, a: { x: number; y: number }, bb: { w: number; h: number }) =>
    Math.abs(c.cx - a.x) < (b.w + bb.w) / 2 && Math.abs(c.cy - a.y) < (b.h + bb.h) / 2;
  it("puts a card to the right of its anchor when nothing is in the way", () => {
    const [c] = placeCallouts([box("s", 0.3, 0.5)], size, 30, [], []);
    expect(c!.cx).toBeGreaterThan(300 + 60);
    expect(Math.abs(c!.cy - 500)).toBeLessThan(1);
  });
  it("keeps off a route line and off a lettered circle", () => {
    // A vertical route runs through the anchor and continues right of it at x=0.34 → the card must not sit on it.
    const line = [{ x: 0.3, y: 0.1 }, { x: 0.3, y: 0.9 }];
    const line2 = [{ x: 0.36, y: 0.2 }, { x: 0.36, y: 0.8 }];
    const [c] = placeCallouts([box("s", 0.3, 0.5)], size, 30, [line, line2], [{ x: 520, y: 500, r: 20 }]);
    const left = c!.cx - 60, right = c!.cx + 60;
    expect(left > 300 + 5 && right < 360 - 5 ? false : (right < 360 - 5 || left > 360 + 5) && (right < 300 - 5 || left > 300 + 5)).toBe(true);
  });
  it("two cards for neighbouring anchors do not overlap, and a moved card stays put", () => {
    const [a, b] = placeCallouts([box("a", 0.5, 0.5), box("b", 0.5, 0.51)], size, 30, [], []);
    expect(hits(a!, box("a", 0, 0), { x: b!.cx, y: b!.cy }, box("b", 0, 0))).toBe(false);
    const [pinned] = placeCallouts([box("a", 0.5, 0.5)], size, 30, [], [], { a: { x: 0.1, y: 0.9 } });
    expect(pinned).toMatchObject({ cx: 100, cy: 900 });
  });
  it("stays inside the picture even when no clean spot exists", () => {
    // A box wider than the room left of the anchor, with obstacles all around: the fallback is clamped to the edge.
    const ring = Array.from({ length: 24 }, (_, i) => ({ x: 960 - 40 * Math.cos(i), y: 500 + 40 * Math.sin(i), r: 400 }));
    const [c] = placeCallouts([box("s", 0.96, 0.5)], size, 30, [], ring);
    expect(c!.cx + 60).toBeLessThanOrEqual(1000);
    expect(c!.cx - 60).toBeGreaterThanOrEqual(0);
  });
});
