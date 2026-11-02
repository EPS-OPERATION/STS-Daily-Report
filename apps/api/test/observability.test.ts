import { afterEach, expect, spyOn, test } from "bun:test";
import { Elysia } from "elysia";
import { dbIsReady } from "../src/db/health.js";
import { heartbeatUrl, pingHeartbeat } from "../src/observability/heartbeat.js";
import { scrubServerEvent, stripQuery } from "../src/observability/scrub.js";
import { errorPlugin } from "../src/plugins/errors.js";
import { AppError, NotFoundError } from "../src/shared/errors/app-error.js";

afterEach(() => {
  spyOn(console, "error").mockRestore();
});

test("readiness is true when the query works, false when it fails or hangs", async () => {
  expect(await dbIsReady(async () => 1)).toBe(true);
  expect(await dbIsReady(async () => { throw new Error("connection refused"); })).toBe(false);
  expect(await dbIsReady(() => new Promise(() => {}), 20)).toBe(false);
});

test("error reports drop cookies, bodies, query strings, user and sensitive headers", () => {
  const event = scrubServerEvent({
    request: {
      url: "https://app.example.com/api/v1/auth/reset-password?token=abc123#x",
      headers: { cookie: "sts_session=secret", Authorization: "Bearer t", "x-forwarded-for": "1.2.3.4", "user-agent": "curl" },
      cookies: { sts_session: "secret" },
      data: { password: "hunter2" },
      query_string: "token=abc123",
    },
    user: { id: "u1", ip_address: "1.2.3.4" },
  });
  expect(event.request?.url).toBe("https://app.example.com/api/v1/auth/reset-password");
  expect(event.request?.headers).toEqual({ "user-agent": "curl" });
  expect(event.request?.cookies).toBeUndefined();
  expect(event.request?.data).toBeUndefined();
  expect(event.request?.query_string).toBeUndefined();
  expect(event.user).toBeUndefined();
  expect(stripQuery("/a/b")).toBe("/a/b");
});

test("heartbeat: success pings the URL, failure pings /fail, trailing slashes are ignored", async () => {
  expect(heartbeatUrl("https://hc-ping.com/uuid/", true)).toBe("https://hc-ping.com/uuid");
  expect(heartbeatUrl("https://hc-ping.com/uuid", false)).toBe("https://hc-ping.com/uuid/fail");
  await pingHeartbeat(undefined); // no URL configured: nothing happens
  await pingHeartbeat("http://127.0.0.1:1/never"); // unreachable: swallowed
});

const app = new Elysia()
  .use(errorPlugin)
  .get("/api/v1/projects/boom", () => {
    throw new Error("relation \"x\" does not exist");
  })
  .get("/api/v1/auth/boom", () => {
    throw new Error("duplicate key value violates unique constraint (email)=(secret@example.com)");
  })
  .get("/api/v1/projects/missing", () => {
    throw new NotFoundError("Project not found");
  });

test("an unexpected error becomes a 500 and is written to the log with its route", async () => {
  const log = spyOn(console, "error").mockImplementation(() => {});
  const res = await app.handle(new Request("http://localhost/api/v1/projects/boom?search=1"));
  expect(res.status).toBe(500);
  expect(log).toHaveBeenCalledTimes(1);
  const [line] = log.mock.calls[0] as [string, ...unknown[]];
  expect(line).toContain("GET /api/v1/projects/boom");
  expect(line).not.toContain("search=1");
});

test("a sensitive route logs only the error type, never the message", async () => {
  const log = spyOn(console, "error").mockImplementation(() => {});
  const res = await app.handle(new Request("http://localhost/api/v1/auth/boom"));
  expect(res.status).toBe(500);
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret@example.com");
  expect(JSON.stringify(log.mock.calls)).toContain("Error on GET /api/v1/auth/boom");
});

test("expected application errors are not reported", async () => {
  const log = spyOn(console, "error").mockImplementation(() => {});
  const res = await app.handle(new Request("http://localhost/api/v1/projects/missing"));
  expect(res.status).toBe(404);
  expect(log).not.toHaveBeenCalled();
  expect(new NotFoundError() instanceof AppError).toBe(true);
});
