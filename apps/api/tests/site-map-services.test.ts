import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
const suite = databaseUrl ? describe : describe.skip;

suite("Facility and multi-map service persistence (isolated database)", () => {
  it("supports CRUD, dynamic Views, marker drafts, cross-Project rejection and reuse without a Zone", async () => {
    const name = "sts_facility_test_" + crypto.randomUUID().replaceAll("-", "");
    if (!/^sts_facility_test_[a-f0-9]+$/.test(name)) throw new Error("Unsafe test database name");
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
        for (const statement of (await Bun.file(directory + "/" + file).text()).split("--> statement-breakpoint")) {
          if (statement.trim()) await db.unsafe(statement);
        }
      }
      const project = crypto.randomUUID(),
        otherProject = crypto.randomUUID();
      await db`INSERT INTO projects(id,code,name) VALUES (${project},'P','Project'),(${otherProject},'Q','Other Project')`;
      const contractor = crypto.randomUUID();
      await db`INSERT INTO contractors(id,code,name) VALUES (${contractor},'C','Fixture contractor')`;
      await db`INSERT INTO project_contractors(project_id,contractor_id) VALUES (${project},${contractor})`;
      const fixture = fileURLToPath(new URL("./fixtures/site-map-services.ts", import.meta.url));
      const child = Bun.spawn([Bun.which("bun")!, fixture, project, otherProject, contractor], {
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
      expect(stdout).toContain("persistence and isolation verified");
      expect((await db`SELECT count(*)::int AS count FROM zones`)[0]?.count).toBe(0);
      const adminEmail = "explicit-config-fixture@sts.test",
        operatorEmail = "admin-without-grant@sts.test";
      await db`INSERT INTO users(email,display_name,can_manage_site_configuration) VALUES (${adminEmail},'Explicit fixture admin',true),(${operatorEmail},'Default-deny fixture user',false)`;
      const httpFixture = fileURLToPath(new URL("./fixtures/site-http.ts", import.meta.url));
      const httpChild = Bun.spawn(
        [Bun.which("bun")!, httpFixture, project, otherProject, contractor, adminEmail, operatorEmail],
        {
          env: {
            ...globalThis.process.env,
            DATABASE_URL: testUrl.toString(),
            MINIO_PUBLIC_URL: "http://127.0.0.1:9000",
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [httpOut, httpErr, httpExit] = await Promise.all([
        new Response(httpChild.stdout).text(),
        new Response(httpChild.stderr).text(),
        httpChild.exited,
      ]);
      expect({ exit: httpExit, stderr: httpErr, stdout: httpOut }).toMatchObject({ exit: 0, stderr: "" });
      expect(httpOut).toContain("MinIO persistence verified");
      const counts = async () =>
        (
          await db!`SELECT (SELECT count(*) FROM facilities)::int AS facilities,(SELECT count(*) FROM site_map_views)::int AS views,(SELECT count(*) FROM facility_map_markers)::int AS markers,(SELECT count(*) FROM zone_parts)::int AS parts,(SELECT count(*) FROM site_activities)::int AS activities`
        )[0];
      const beforeBackfill = await counts();
      const backfill = await Bun.file(
        fileURLToPath(new URL("../src/db/backfill/facility-backfill.sql", import.meta.url)),
      ).text();
      for (let iteration = 0; iteration < 2; iteration++) {
        for (const statement of backfill.split("--> statement-breakpoint"))
          if (statement.trim()) await db.unsafe(statement);
      }
      expect(await counts()).toEqual(beforeBackfill);
    } finally {
      await db?.end({ timeout: 5 });
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.end({ timeout: 5 });
    }
  }, 60_000);
});
