import { expect, test } from "bun:test";
import { DAILY_SITE_MARKER_ICON_KEYS } from "../packages/shared/src/daily-site-markers.js";
import { isDailySiteMarkerView } from "../apps/web/src/features/site-activity/utils/daily-site-marker-view.js";

test("daily site markers are enabled only for the canonical Top View key", () => {
  expect(isDailySiteMarkerView({ key: "top" })).toBe(true);
  expect(isDailySiteMarkerView({ key: "overview" })).toBe(false);
  expect(isDailySiteMarkerView({ key: "top-view" })).toBe(false);
  expect(isDailySiteMarkerView(null)).toBe(false);
});

test("daily site marker icon keys are a stable unique allowlist", () => {
  expect(new Set(DAILY_SITE_MARKER_ICON_KEYS).size).toBe(DAILY_SITE_MARKER_ICON_KEYS.length);
  expect(DAILY_SITE_MARKER_ICON_KEYS).toContain("restricted-area");
  expect(DAILY_SITE_MARKER_ICON_KEYS).toContain("other");
});
