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
  it("parses production config without any demo opt-ins", () => {
    const env = parseApiEnv({ DATABASE_URL: "postgres://localhost/unused", NODE_ENV: "production" });
    expect(env.NODE_ENV).toBe("production");
  });
  it("requires supabase credentials when that storage provider is selected", () => {
    expect(() => parseApiEnv({ DATABASE_URL: "postgres://localhost/unused", STORAGE_PROVIDER: "supabase" })).toThrow("SUPABASE_URL");
  });
});
