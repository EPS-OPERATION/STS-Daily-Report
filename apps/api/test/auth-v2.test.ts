import { describe, expect, it } from "bun:test";
import { parseApiEnv } from "@sts/env";
import { hashPassword, verifyPassword } from "../src/auth/password.js";

describe("Auth v2 credentials and production configuration", () => {
  it("uses Argon2id, preserves password whitespace, and rejects missing hashes", async () => {
    const hash = await hashPassword(" Password with spaces ");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(" Password with spaces ", hash)).toBe(true);
    expect(await verifyPassword("Password with spaces", hash)).toBe(false);
    expect(await verifyPassword(" Password with spaces ", null)).toBe(false);
  });
  it("allows password production without opting into demo login", () => {
    const env = parseApiEnv({ DATABASE_URL: "postgres://localhost/unused", NODE_ENV: "production", AUTH_PROVIDER: "password" });
    expect(env.ALLOW_DEMO_LOGIN).toBe(false);
  });
  it("still refuses unapproved local-email production", () => {
    expect(() => parseApiEnv({ DATABASE_URL: "postgres://localhost/unused", NODE_ENV: "production", AUTH_PROVIDER: "local-email" })).toThrow("Refusing to start");
  });
});
