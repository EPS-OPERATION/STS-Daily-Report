import { describe, expect, it } from "bun:test";
import {
  ACCIDENT_CATEGORIES,
  BUILDINGS,
  INJURY_CATEGORIES,
  RETIRED_BUILDING_CODES,
  manHours,
  timeToMinutes,
  timeWindowsOverlap,
  workloadLevel,
} from "@sts/shared";

describe("manHours (NMH) calculation", () => {
  it("calculates normal working hours without OT correctly", () => {
    // 10 workers * 8 hours = 80 man-hours
    expect(manHours(10, 8, 0)).toBe(80);
  });

  it("calculates normal hours + overtime hours", () => {
    // 20 workers * (8 normal + 2.5 OT) = 20 * 10.5 = 210 man-hours
    expect(manHours(20, 8, 2.5)).toBe(210);
  });

  it("handles null or undefined hours gracefully without NaN", () => {
    expect(manHours(15, null, null)).toBe(0);
    expect(manHours(10, 8, null)).toBe(80);
    expect(manHours(5, null, 3)).toBe(15);
  });

  it("returns 0 when headcount is zero", () => {
    expect(manHours(0, 8, 4)).toBe(0);
  });
});

describe("timeToMinutes", () => {
  it("converts HH:MM strings to minutes from midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("08:00")).toBe(480);
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("17:00")).toBe(1020);
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("timeWindowsOverlap", () => {
  it("detects overlapping time intervals", () => {
    // 08:00-12:00 and 10:00-14:00 overlap between 10:00 and 12:00
    expect(timeWindowsOverlap("08:00", "12:00", "10:00", "14:00")).toBe(true);
  });

  it("detects enclosed time intervals", () => {
    // 08:00-17:00 contains 09:00-12:00
    expect(timeWindowsOverlap("08:00", "17:00", "09:00", "12:00")).toBe(true);
  });

  it("returns false for disjoint time intervals", () => {
    // 08:00-12:00 and 13:00-17:00 do not overlap
    expect(timeWindowsOverlap("08:00", "12:00", "13:00", "17:00")).toBe(false);
  });

  it("returns false for adjacent touching intervals (half-open [start, end))", () => {
    // Morning shift ends at 12:00, afternoon starts at 12:00 -> no clash
    expect(timeWindowsOverlap("08:00", "12:00", "12:00", "16:00")).toBe(false);
  });
});

describe("workloadLevel (Labour density)", () => {
  it("returns none for zero headcount", () => {
    expect(workloadLevel(0, 0)).toBe("none");
  });

  it("returns low for under 20 workers and under 3 contractors", () => {
    expect(workloadLevel(15, 2)).toBe("low");
  });

  it("returns medium when headcount reaches 20 or contractors reach 3", () => {
    expect(workloadLevel(20, 1)).toBe("medium");
    expect(workloadLevel(10, 3)).toBe("medium");
  });

  it("returns high when headcount reaches 40 or contractors reach 4", () => {
    expect(workloadLevel(40, 2)).toBe("high");
    expect(workloadLevel(15, 4)).toBe("high");
  });
});

describe("Safety accident classification", () => {
  it("classifies only LTI and Non-LTI as injury categories that reset safety clock", () => {
    expect(INJURY_CATEGORIES).toEqual(["lti", "non_lti"]);
  });

  it("verifies 5 canonical accident categories exist", () => {
    const codes = ACCIDENT_CATEGORIES.map((c) => c.code);
    expect(codes).toContain("lti");
    expect(codes).toContain("non_lti");
    expect(codes).toContain("property_damage");
    expect(codes).toContain("near_miss");
    expect(codes).toContain("emergency");
  });
});

describe("Building Master Data", () => {
  it("contains exactly 15 active facilities for STS 9.9 MW site", () => {
    expect(BUILDINGS.length).toBe(15);
  });

  it("keeps BMS (Biomass Storage) retired instead of deleted for FK safety", () => {
    expect((RETIRED_BUILDING_CODES as readonly string[]).includes("BMS")).toBe(true);
    expect((BUILDINGS as readonly { code: string }[]).some((b) => b.code === "BMS")).toBe(false);
  });

  it("includes essential plant buildings", () => {
    const codes = BUILDINGS.map((b) => b.code);
    expect(codes).toContain("BLR"); // Boiler
    expect(codes).toContain("TG");  // Turbine Generator
    expect(codes).toContain("ACC"); // Air Cooled Condenser
    expect(codes).toContain("STK"); // Stack
  });
});
