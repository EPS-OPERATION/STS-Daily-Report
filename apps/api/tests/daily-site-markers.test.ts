import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
const suite = databaseUrl ? describe : describe.skip;

suite("Daily Site Markers (isolated PostgreSQL)", () => {
  it("enforces Top View, Contractor ownership, sharing, dates and withdraw history", async () => {
    const name = "sts_daily_marker_test_" + crypto.randomUUID().replaceAll("-", "");
    if (!/^sts_daily_marker_test_[a-f0-9]+$/.test(name)) throw new Error("Unsafe test database name");
    const adminUrl = new URL(databaseUrl!);
    adminUrl.pathname = "/postgres";
    const testUrl = new URL(databaseUrl!);
    testUrl.pathname = "/" + name;
    const admin = postgres(adminUrl.toString(), { max: 1 });
    let db: ReturnType<typeof postgres> | undefined;
    try {
      await admin.unsafe(`CREATE DATABASE "${name}"`);
      db = postgres(testUrl.toString(), { max: 1 });
      const migrations = fileURLToPath(new URL("../src/db/migrations/", import.meta.url));
      for (const file of (await readdir(migrations)).filter((f) => /^\d{4}.*\.sql$/.test(f)).sort()) {
        for (const statement of (await Bun.file(migrations + "/" + file).text()).split("--> statement-breakpoint")) {
          if (statement.trim()) await db.unsafe(statement);
        }
      }

      const ids = Object.fromEntries(
        [
          "project",
          "otherProject",
          "contractorA",
          "contractorB",
          "unassignedContractor",
          "topView",
          "overviewView",
          "otherView",
          "facility",
          "otherFacility",
          "creator",
          "peer",
          "userB",
          "outsider",
          "inactiveMember",
          "configUser",
        ].map((key) => [key, crypto.randomUUID()]),
      ) as Record<string, string>;
      const emails = {
        creator: "marker-creator@sts.test",
        peer: "marker-peer@sts.test",
        userB: "marker-contractor-b@sts.test",
        outsider: "marker-outsider@sts.test",
        inactiveMember: "marker-inactive@sts.test",
        configUser: "marker-config-only@sts.test",
      };
      await db`INSERT INTO projects(id,code,name) VALUES (${ids.project},'DM-A','Marker Project'),(${ids.otherProject},'DM-B','Other Project')`;
      await db`INSERT INTO contractors(id,code,name) VALUES
        (${ids.contractorA},'DM-CA','Contractor A'),(${ids.contractorB},'DM-CB','Contractor B'),(${ids.unassignedContractor},'DM-CX','Unassigned')`;
      await db`INSERT INTO project_contractors(project_id,contractor_id) VALUES
        (${ids.project},${ids.contractorA}),(${ids.project},${ids.contractorB}),(${ids.otherProject},${ids.contractorA})`;
      await db`INSERT INTO users(id,email,display_name,can_manage_site_configuration) VALUES
        (${ids.creator},${emails.creator},'Somchai P.',false),
        (${ids.peer},${emails.peer},'Peer A',false),
        (${ids.userB},${emails.userB},'User B',false),
        (${ids.outsider},${emails.outsider},'Outsider',false),
        (${ids.inactiveMember},${emails.inactiveMember},'Inactive member',false),
        (${ids.configUser},${emails.configUser},'Config only',true)`;
      await db`INSERT INTO contractor_memberships(user_id,contractor_id,status) VALUES
        (${ids.creator},${ids.contractorA},'active'),(${ids.peer},${ids.contractorA},'active'),
        (${ids.userB},${ids.contractorB},'active'),(${ids.inactiveMember},${ids.contractorA},'inactive')`;
      const map = crypto.randomUUID(),
        otherMap = crypto.randomUUID();
      await db`INSERT INTO site_plans(id,project_id,name,is_active,is_default) VALUES
        (${map},${ids.project},'Master Site Layout',true,true),(${otherMap},${ids.otherProject},'Other Map',true,true)`;
      await db`INSERT INTO site_map_views(id,site_plan_id,key,name,width,height,sort_order,is_active) VALUES
        (${ids.topView},${map},'top','Top View',1586,992,2,true),
        (${ids.overviewView},${map},'overview','Overview',1513,1039,1,true),
        (${ids.otherView},${otherMap},'top','Top View',1000,700,1,true)`;
      await db`INSERT INTO facilities(id,project_id,key,name,code) VALUES
        (${ids.facility},${ids.project},'boiler','Boiler','BLR'),
        (${ids.otherFacility},${ids.otherProject},'foreign','Foreign Facility','F-01')`;
      await db`INSERT INTO facility_map_markers(facility_id,site_map_view_id,x,y) VALUES (${ids.facility},${ids.topView},0.2,0.3)`;

      const fixture = fileURLToPath(new URL("./fixtures/daily-site-markers.ts", import.meta.url));
      const child = Bun.spawn([Bun.which("bun")!, fixture, JSON.stringify(ids), JSON.stringify(emails)], {
        env: { ...process.env, DATABASE_URL: testUrl.toString() },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exit] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ exit, stderr, stdout }).toMatchObject({ exit: 0, stderr: "" });
      expect(stdout).toContain("daily marker authorization and persistence verified");
      expect((await db`SELECT count(*)::int AS n FROM site_activities`)[0]?.n).toBe(0);
      expect(
        (
          await db`SELECT x,y FROM facility_map_markers WHERE facility_id=${ids.facility} AND site_map_view_id=${ids.topView}`
        )[0],
      ).toEqual({ x: 0.2, y: 0.3 });
      expect((await db`SELECT count(*)::int AS n FROM daily_site_markers`)[0]?.n).toBe(2);
    } finally {
      await db?.end({ timeout: 5 });
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.end({ timeout: 5 });
    }
  }, 60_000);
});
