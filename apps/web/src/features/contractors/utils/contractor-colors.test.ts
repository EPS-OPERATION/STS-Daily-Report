import { expect, test } from "bun:test";
import { CHART_SERIES } from "@/app/theme/chart-palette.js";
import { contractorColorMap } from "./contractor-colors.js";

test("uses the stored coordination-map colour for each contractor", () => {
  const colors = contractorColorMap(["ZT", "SN"], [
    { code: "SN", color: "#123456" },
    { code: "ZT", color: "#ABCDEF" },
  ]);
  expect(colors.get("SN")).toBe("#123456");
  expect(colors.get("ZT")).toBe("#ABCDEF");
});

test("falls back to the chart palette when a contractor has no stored colour", () => {
  const colors = contractorColorMap(["SN", "ZT"], [{ code: "SN", color: null }]);
  expect(colors.get("SN")).toBe(CHART_SERIES[0]!);
  expect(colors.get("ZT")).toBe(CHART_SERIES[1]!);
});
