import { expect, test } from "bun:test";
import { addDays, attendanceOf, isoWeekLabel, isoWeekOf, mondayOf, round1 } from "@sts/shared";

test("isoWeekOf follows ISO 8601 (Mon–Sun, week 1 holds the first Thursday)", () => {
  expect(isoWeekLabel("2026-10-19")).toBe("2026-W43");
  expect(isoWeekLabel("2026-10-25")).toBe("2026-W43"); // Sunday stays in the week
  expect(isoWeekLabel("2026-10-26")).toBe("2026-W44");
  // year boundaries: the ISO year can differ from the calendar year
  expect(isoWeekOf("2026-12-31")).toEqual({ year: 2026, week: 53 });
  expect(isoWeekOf("2027-01-01")).toEqual({ year: 2026, week: 53 });
  expect(isoWeekOf("2024-12-30")).toEqual({ year: 2025, week: 1 });
  expect(isoWeekOf("2026-01-01")).toEqual({ year: 2026, week: 1 });
});

test("addDays crosses month and year ends in UTC", () => {
  expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
});

test("mondayOf maps every weekday of a week to its Monday", () => {
  for (const d of ["2026-03-09", "2026-03-11", "2026-03-15"]) expect(mondayOf(d)).toBe("2026-03-09");
  expect(mondayOf("2026-03-16")).toBe("2026-03-16");
});

test("round1 rounds to one decimal", () => {
  expect(round1(1.26)).toBe(1.3);
  expect(round1(2)).toBe(2);
});

test("attendanceOf counts only the shifts that were submitted", () => {
  const base = { thaiMale: 4, thaiFemale: 1, foreignMale: 0, foreignFemale: 0, eveningThaiMale: null, eveningThaiFemale: null, eveningForeignMale: null, eveningForeignFemale: null, workHours: 8, otHours: 0 };
  const morningOnly = attendanceOf({ ...base, morningStatus: "submitted", eveningStatus: "draft" });
  const nothing = attendanceOf({ ...base, morningStatus: "draft", eveningStatus: "draft" });
  expect(morningOnly.manDays).toBeGreaterThan(0);
  expect(nothing.manDays).toBe(0);
});

test("an afternoon-only day counts the standard 8 h per person plus its OT (ZT 20 Oct: 87 people, 118 OT h)", () => {
  const zt = attendanceOf({
    morningStatus: "draft", eveningStatus: "submitted",
    thaiMale: 0, thaiFemale: 0, foreignMale: 0, foreignFemale: 0,
    eveningThaiMale: 60, eveningThaiFemale: 7, eveningForeignMale: 20, eveningForeignFemale: 0,
    workHours: null, otHours: null, otManHours: 118,
  });
  expect(zt.manDays).toBe(87);
  expect(zt.manHours).toBe(87 * 8 + 118);
});
