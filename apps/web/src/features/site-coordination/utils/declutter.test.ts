import { expect, test } from "bun:test";
import { declutter, type DeclutterEntry } from "./declutter.js";

const job = (id: string, x: number, opts: Partial<DeclutterEntry> = {}): DeclutterEntry => ({
  id, pinned: false,
  mark: [x - 10, 0, x + 10, 20],
  caption: [x - 40, 22, x + 40, 36],
  full: [x - 40, 22, x + 40, 50],
  ...opts,
});

test("zoomed out: icons only, except the pinned job", () => {
  const r = declutter([job("a", 0), job("b", 500, { pinned: true })], 400);
  expect(r.get("a")).toBe("icon");
  expect(r.get("b")).toBe("full");
});

test("middle zoom: names but no notes", () => {
  expect(declutter([job("a", 0)], 900).get("a")).toBe("caption");
});

test("close zoom: name and note when there is room", () => {
  expect(declutter([job("a", 0)], 2000).get("a")).toBe("full");
});

test("two labels that would overlap: the first keeps it, the second shows its icon", () => {
  const r = declutter([job("a", 0), job("b", 30)], 2000);
  expect(r.get("a")).toBe("full");
  expect(r.get("b")).toBe("icon");
});

test("a note that hits a neighbour falls back to the name only", () => {
  const r = declutter([job("a", 0), job("b", 60, { mark: [30, 40, 50, 55], caption: null, full: null })], 2000);
  expect(r.get("a")).toBe("caption");
});

test("a label never covers another job's icon", () => {
  const r = declutter([job("a", 0), job("b", 25, { caption: null, full: null })], 900);
  expect(r.get("a")).toBe("caption");
  const covered = declutter([job("a", 0), job("b", 25, { mark: [15, 24, 35, 34], caption: null, full: null })], 900);
  expect(covered.get("a")).toBe("icon");
});
