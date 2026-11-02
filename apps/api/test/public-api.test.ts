import { expect, test } from "bun:test";
import { isPublicApi } from "../src/config/public-api.js";

test("login, registration and the cron-secret sync route need no session", () => {
  expect(isPublicApi("POST", "/api/v1/auth/login")).toBe(true);
  expect(isPublicApi("POST", "/api/v1/internal/weather/sync")).toBe(true);
  expect(isPublicApi("POST", "/api/v1/internal/weather/sync/")).toBe(true);
});

test("everything else (including reads and other internal paths) stays behind a session", () => {
  expect(isPublicApi("GET", "/api/v1/internal/weather/sync")).toBe(false);
  expect(isPublicApi("GET", "/api/v1/projects")).toBe(false);
  expect(isPublicApi("GET", "/api/v1/projects/x/weekly-summary")).toBe(false);
  expect(isPublicApi("POST", "/api/v1/users/1/approve")).toBe(false);
});
