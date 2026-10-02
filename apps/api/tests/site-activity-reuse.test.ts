import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
const suite = databaseUrl ? describe : describe.skip;

suite("Activity reuse query behavior (isolated database)", () => {
  it("filters recent work by facility/contractor/part/date with project isolation", async () => {
    const name = "sts_reuse_test_" + crypto.randomUUID().replaceAll("-", "");
    if (!/^sts_reuse_test_[a-f0-9]+$/.test(name)) throw new Error("Unsafe test database name");
    const adminUrl = new URL(databaseUrl!);
    adminUrl.pathname = "/postgres";
    const testUrl = new URL(databaseUrl!);
    testUrl.pathname = "/" + name;
    const admin = postgres(adminUrl.toString(), { max: 1 });
    let db: ReturnType<typeof postgres> | undefined;
    try {
      await admin.unsafe(`CREATE DATABASE "${name}"`);
      db = postgres(testUrl.toString(), { max: 1 });
      const directory = fileURLToPath(new URL("../src/db/migrations/", import.meta.url));
      for (const file of (await readdir(directory)).filter((file) => /^\d{4}.*\.sql$/.test(file)).sort()) {
        for (const statement of (await Bun.file(directory + "/" + file).text()).split("--> statement-breakpoint"))
          if (statement.trim()) await db.unsafe(statement);
      }
      const fixture = fileURLToPath(new URL("./fixtures/site-activity-reuse.ts", import.meta.url));
      const child = Bun.spawn([Bun.which("bun")!, fixture], {
        env: { ...globalThis.process.env, DATABASE_URL: testUrl.toString() },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exit] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ exit, stderr, stdout }).toMatchObject({ exit: 0, stderr: "" });
      expect(stdout).toContain("activity reuse behavior verified");
    } finally {
      await db?.end({ timeout: 5 });
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.end({ timeout: 5 });
    }
  }, 60_000);
});
