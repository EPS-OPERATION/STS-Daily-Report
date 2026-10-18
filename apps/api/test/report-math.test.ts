import { expect, test } from "bun:test";
import { addDays, attendanceOf, mondayOf, round1 } from "@sts/shared";

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
