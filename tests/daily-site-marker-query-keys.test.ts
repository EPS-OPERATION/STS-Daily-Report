import { expect, test } from "bun:test";
import { dailySiteMarkerKeys } from "../apps/web/src/consts/query-keys/daily-site-markers.js";
import { siteOperationKeys } from "../apps/web/src/consts/query-keys/site-operations.js";

test("daily site marker cache is separate from Facility Marker cache", () => {
  expect(dailySiteMarkerKeys.list("project", "view", "2026-10-02")).not.toEqual(
    siteOperationKeys.markers("project", "view", false),
  );
});
