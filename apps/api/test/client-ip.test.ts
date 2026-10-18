import { expect, test } from "bun:test";
import { clientIp } from "../src/auth/client-ip.js";

const h = (init: Record<string, string>) => new Headers(init);

test("uses the socket peer unless the proxy is trusted", () => {
  expect(clientIp(h({ "x-forwarded-for": "9.9.9.9" }), "10.0.0.1", false)).toBe("10.0.0.1");
  expect(clientIp(h({}), undefined, false)).toBe("unknown");
});

test("trusted proxy: first forwarded hop, then x-real-ip, then the peer", () => {
  expect(clientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), "10.0.0.1", true)).toBe("203.0.113.7");
  expect(clientIp(h({ "x-real-ip": "198.51.100.2" }), "10.0.0.1", true)).toBe("198.51.100.2");
  expect(clientIp(h({}), "10.0.0.1", true)).toBe("10.0.0.1");
});
