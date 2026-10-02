import { expect, test } from "bun:test";
import { getSitePlanScaleLimits } from "../apps/web/src/features/site-maps/hooks/use-site-plan-viewport.js";

test("mobile zoom-out decreases the fitted image scale instead of jumping to a desktop minimum", () => {
  const size = { w: 342, h: 400 },
    fit = Math.min(size.w / 1513, size.h / 1039);
  const limits = getSitePlanScaleLimits(size, 1513, 1039);
  const zoomedOut = Math.min(limits.max, Math.max(limits.min, fit * 0.8));
  expect(zoomedOut).toBeLessThan(fit);
  expect(zoomedOut).toBeGreaterThan(0);
  expect(getSitePlanScaleLimits(size, 6000, 4000).min).toBeLessThan(Math.min(size.w / 6000, size.h / 4000));
});
