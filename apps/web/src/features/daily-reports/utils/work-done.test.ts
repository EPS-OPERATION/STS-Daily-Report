import { expect, test } from "bun:test";
import type { WorkDoneItem } from "../components/work-done-summary-table.js";
import { sortWorkDone } from "./work-done.js";

const item = (id: string, over: Partial<WorkDoneItem>): WorkDoneItem => ({
  id,
  reportDate: "2026-10-20",
  contractorCode: "LT",
  contractorName: "L-tab",
  buildingCode: "ACC",
  buildingName: "ACC",
  workDescription: "work",
  headcount: 1,
  planPercent: null,
  actualPercent: null,
  ...over,
});

const rows = [
  item("a", { contractorCode: "SN", contractorName: "Sinoma", buildingName: "Water Tank", headcount: 8 }),
  item("b", { contractorName: "L-tab", buildingName: "Water Tank", headcount: 12, planPercent: 60, actualPercent: 40 }),
  item("c", { contractorCode: "CKM", contractorName: "Chatkamon Krancha", buildingName: "Compressor Room", headcount: 9 }),
  item("d", { contractorName: "L-tab", buildingName: "ACC", headcount: 7, planPercent: 50, actualPercent: 70 }),
];
const ids = (list: WorkDoneItem[]) => list.map((r) => r.id);

test("default contractor sort keeps each company together, buildings A→Z inside it", () => {
  expect(ids(sortWorkDone(rows, { key: "contractor", dir: "asc" }))).toEqual(["c", "d", "b", "a"]);
  expect(ids(sortWorkDone(rows, { key: "contractor", dir: "desc" }))).toEqual(["a", "d", "b", "c"]);
});

test("numbers sort by value and blank plan/actual stay last in both directions", () => {
  expect(ids(sortWorkDone(rows, { key: "headcount", dir: "desc" }))).toEqual(["b", "c", "a", "d"]);
  expect(ids(sortWorkDone(rows, { key: "actual", dir: "desc" })).slice(0, 2)).toEqual(["d", "b"]);
  expect(ids(sortWorkDone(rows, { key: "actual", dir: "asc" })).slice(0, 2)).toEqual(["b", "d"]);
});

test("status sorts pending, behind, on plan, ahead", () => {
  expect(ids(sortWorkDone(rows, { key: "status", dir: "asc" })).slice(-2)).toEqual(["b", "d"]);
});

test("sorting never changes the input array", () => {
  const before = ids(rows);
  sortWorkDone(rows, { key: "building", dir: "desc" });
  expect(ids(rows)).toEqual(before);
});
