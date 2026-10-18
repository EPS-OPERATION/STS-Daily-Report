import { expect, test } from "bun:test";
import { scrubBreadcrumb, scrubBrowserEvent, stripQuery } from "./error-scrub.js";

test("stripQuery drops the query string and the hash", () => {
  expect(stripQuery("https://app.example.com/reset-password?token=abc#top")).toBe("https://app.example.com/reset-password");
  expect(stripQuery("/field/report")).toBe("/field/report");
});

test("browser events lose tokens in URLs, cookies, bodies and the user", () => {
  const event = scrubBrowserEvent({
    request: {
      url: "https://app.example.com/reset-password?token=abc",
      headers: { Referer: "https://app.example.com/reset-password?token=abc", "User-Agent": "Mozilla" },
      cookies: { a: "b" },
      data: "password=x",
      query_string: "token=abc",
    },
    user: { id: "1" },
    breadcrumbs: [{ data: { from: "/login?next=%2F", to: "/reset-password?token=abc", status: 200 } }],
  });
  expect(event.request?.url).toBe("https://app.example.com/reset-password");
  expect(event.request?.headers?.["Referer"]).toBe("https://app.example.com/reset-password");
  expect(event.request?.headers?.["User-Agent"]).toBe("Mozilla");
  expect(event.request?.cookies).toBeUndefined();
  expect(event.request?.data).toBeUndefined();
  expect(event.user).toBeUndefined();
  expect(event.breadcrumbs?.[0]?.data).toEqual({ from: "/login", to: "/reset-password", status: 200 });
});

test("fetch breadcrumbs keep the path but not the search terms", () => {
  const crumb = scrubBreadcrumb({ data: { url: "/api/v1/contractors?search=secret", method: "GET" } });
  expect(crumb.data?.["url"]).toBe("/api/v1/contractors");
  expect(crumb.data?.["method"]).toBe("GET");
});
