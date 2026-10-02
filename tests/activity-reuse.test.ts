import { expect, test } from "bun:test";
import {
  buildReuseDraft,
  findDuplicate,
  rankSuggestions,
  relativeDayLabel,
} from "../apps/web/src/features/site-activity/utils/activity-reuse.js";
import type { SiteActivityRecord } from "../apps/web/src/types/site-operations.types.js";

function record(overrides: Partial<SiteActivityRecord> & { id: string }): SiteActivityRecord {
  return {
    projectId: "project",
    workDate: "2026-09-30",
    title: "Pipe Installation",
    description: "details",
    status: "active",
    manpower: 12,
    progressPercent: 40,
    startTime: "08:00",
    endTime: "17:00",
    createdAt: "2026-09-30T10:00:00Z",
    facility: { id: "acc", key: 1, name: "ACC", code: "ACC", isActive: true },
    facilityPart: null,
    contractor: { id: "abc", code: "ABC", name: "ABC Construction" },
    ...overrides,
  };
}

test("reuse copies work definition but never the date", () => {
  const draft = buildReuseDraft(record({ id: "a" }), { contractorId: "abc" });
  expect(draft.title).toBe("Pipe Installation");
  expect(draft.description).toBe("details");
  expect(draft.facilityId).toBe("acc");
  expect(draft.status).toBe("active");
  expect(draft.manpower).toBe(12);
  expect(draft.progressPercent).toBe(40);
  expect("workDate" in draft).toBe(false);
});

test("reuse keeps an unauthorized Contractor out of the draft", () => {
  const draft = buildReuseDraft(record({ id: "a" }), { contractorId: null });
  expect(draft.contractorId).toBeNull();
});

test("suggestions prefer same Contractor, then Part, then newest", () => {
  const rows = [
    record({ id: "old", workDate: "2026-09-28", contractor: { id: "xyz", code: "X", name: "X" } }),
    record({
      id: "part",
      workDate: "2026-09-28",
      facilityPart: { id: "c1", facilityId: "acc", code: "C1", name: "C1", isActive: true },
    }),
    record({ id: "new", workDate: "2026-09-30" }),
  ];
  expect(rankSuggestions(rows, { contractorId: "abc", partId: "c1", limit: 5 }).map((row) => row.id)).toEqual([
    "part",
    "new",
    "old",
  ]);
  expect(rankSuggestions(rows, { limit: 2 }).map((row) => row.id)).toEqual(["new", "old"]);
});

test("duplicate detection matches title, Contractor and Part", () => {
  const rows = [record({ id: "a" })];
  expect(findDuplicate(rows, { title: "pipe installation", contractorId: "abc", partId: null }))?.toMatchObject({
    id: "a",
  });
  expect(findDuplicate(rows, { title: "  PIPE INSTALLATION  ", contractorId: "abc", partId: null })).not.toBeNull();
  expect(findDuplicate(rows, { title: "Scaffolding", contractorId: "abc", partId: null })).toBeNull();
  expect(findDuplicate(rows, { title: "Pipe Installation", contractorId: "xyz", partId: null })).toBeNull();
  expect(findDuplicate(rows, { title: "Pipe Installation", contractorId: "abc", partId: "c1" })).toBeNull();
  expect(
    findDuplicate(rows, { title: "Pipe Installation", contractorId: "abc", partId: null, excludeId: "a" }),
  ).toBeNull();
  expect(findDuplicate(rows, { title: "   ", contractorId: "abc", partId: null })).toBeNull();
});

test("relative day labels stay readable", () => {
  expect(relativeDayLabel("2026-10-02", "2026-10-02")).toBe("Today");
  expect(relativeDayLabel("2026-10-01", "2026-10-02")).toBe("Yesterday");
  expect(relativeDayLabel("2026-09-30", "2026-10-02")).toBe("30 Sep 2026");
});
