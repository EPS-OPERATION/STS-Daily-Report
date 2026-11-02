import { Elysia } from "elysia";

// API responses are JSON only: never sniffed, never framed, never cached by shared caches.
export const securityHeaders = new Elysia({ name: "security-headers" }).onAfterHandle({ as: "global" }, ({ set }) => {
  set.headers["x-content-type-options"] = "nosniff";
  set.headers["x-frame-options"] = "DENY";
  set.headers["referrer-policy"] = "no-referrer";
  set.headers["cache-control"] ??= "no-store";
});
