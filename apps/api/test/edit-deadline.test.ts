import { describe, expect, it } from "bun:test";
import { canEditReport, editDeadline } from "@sts/shared";

describe("report edit deadline (12:00 site time, next day)", () => {
  it("is noon Thailand time on the following day", () => {
    expect(editDeadline("2026-10-09").toISOString()).toBe("2026-10-10T05:00:00.000Z");
  });

  it("rolls over month and year ends", () => {
    expect(editDeadline("2026-10-31").toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(editDeadline("2026-12-31").toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });

  it("allows edits up to one minute before noon and blocks from noon", () => {
    expect(canEditReport("2026-10-09", new Date("2026-10-10T11:59:00+07:00"))).toBe(true);
    expect(canEditReport("2026-10-09", new Date("2026-10-10T12:00:00+07:00"))).toBe(false);
  });

  it("allows edits on the report day itself, including late evening", () => {
    expect(canEditReport("2026-10-09", new Date("2026-10-09T23:30:00+07:00"))).toBe(true);
  });
});
