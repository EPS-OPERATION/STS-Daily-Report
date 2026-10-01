import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
const suite = databaseUrl ? describe : describe.skip;
const migrationDir = fileURLToPath(new URL("../src/db/migrations/", import.meta.url));
const backfillPath = fileURLToPath(new URL("../src/db/backfill/facility-backfill.sql", import.meta.url));

suite("Facility migration on populated legacy data (isolated database)", () => {
  it("preserves history, deduplicates Facilities across Maps, and reruns without duplication", async () => {
    const name = "sts_facility_test_" + crypto.randomUUID().replaceAll("-", "");
    if (!/^sts_facility_test_[a-f0-9]+$/.test(name)) throw new Error("Unsafe test database name");
    const adminUrl = new URL(databaseUrl!);
    adminUrl.pathname = "/postgres";
    const admin = postgres(adminUrl.toString(), { max: 1 });
    const testUrl = new URL(databaseUrl!);
    testUrl.pathname = "/" + name;
    let db: ReturnType<typeof postgres> | undefined;
    const executeFile = async (path: string) => {
      const source = await Bun.file(path).text();
      for (const statement of source.split("--> statement-breakpoint")) {
        if (statement.trim()) await db!.unsafe(statement);
      }
    };
    try {
      await admin.unsafe(`CREATE DATABASE "${name}"`);
      db = postgres(testUrl.toString(), { max: 1 });
      const migrations = (await readdir(migrationDir)).filter((file) => /^\d{4}.*\.sql$/.test(file)).sort();
      for (const file of migrations.filter((file) => file.slice(0, 4) <= "0010")) {
        await executeFile(migrationDir + "/" + file);
      }
      const project = crypto.randomUUID(),
        otherProject = crypto.randomUUID();
      const parent = crypto.randomUUID(),
        accZone = crypto.randomUUID(),
        fallbackZone = crypto.randomUUID(),
        removedZone = crypto.randomUUID();
      const map = crypto.randomUUID(),
        secondMap = crypto.randomUUID(),
        otherMap = crypto.randomUUID();
      const contractor = crypto.randomUUID(),
        part = crypto.randomUUID();
      const wholeActivity = crypto.randomUUID(),
        partActivity = crypto.randomUUID(),
        parentActivity = crypto.randomUUID(),
        fallbackActivity = crypto.randomUUID();
      await db`INSERT INTO projects(id,code,name) VALUES (${project},'TEST-P','Fixture Project'),(${otherProject},'TEST-Q','Other Project')`;
      await db`INSERT INTO contractors(id,code,name) VALUES (${contractor},'TEST-C','Fixture Contractor')`;
      await db`INSERT INTO zones(id,project_id,code,name) VALUES (${parent},${project},'5','Logical group')`;
      await db`INSERT INTO zones(id,project_id,parent_id,code,name) VALUES
        (${accZone},${project},${parent},'5.1','Air Cooled Condenser'),
        (${fallbackZone},${project},${parent},'5.2','Legacy physical location'),
        (${removedZone},${project},${parent},'5.3','Explicitly removed point')`;
      await db`INSERT INTO site_plans(id,project_id,name,background_object_key,original_width,original_height,is_default) VALUES
        (${map},${project},'Master','test/master.png',1000,600,true),
        (${secondMap},${project},'Expansion',null,null,null,false),
        (${otherMap},${otherProject},'Other',null,null,null,true)`;
      await db`INSERT INTO site_marker_definitions(site_plan_id,key,no,name,zone_id,overview_x,overview_y,top_view_x,top_view_y) VALUES
        (${map},'acc',6,'ACC',${accZone},0.2,0.3,0.4,0.6),
        (${map},'tr',8,'TR',null,0.5,0.5,0.6,0.4),
        (${secondMap},'acc',6,'ACC',${accZone},0.8,0.2,0.7,0.4),
        (${otherMap},'acc',6,'Other ACC',null,null,null,0.1,0.1)`;
      await db`INSERT INTO zone_parts(id,zone_id,code,name) VALUES (${part},${accZone},'A','Part A')`;
      await db`INSERT INTO site_activities(id,project_id,zone_id,zone_part_id,contractor_id,work_date,title) VALUES
        (${wholeActivity},${project},${accZone},null,${contractor},'2026-10-01','Whole ACC'),
        (${partActivity},${project},${accZone},${part},${contractor},'2026-10-01','ACC Part work'),
        (${parentActivity},${project},${parent},null,${contractor},'2026-10-01','Ambiguous parent work'),
        (${fallbackActivity},${project},${fallbackZone},null,${contractor},'2026-10-01','Legacy leaf work')`;
      const polygon = {
        type: "polygon",
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.5, y: 0.2 },
          { x: 0.5, y: 0.6 },
        ],
      };
      await db`INSERT INTO zone_map_areas(site_plan_id,zone_id,geometry) VALUES (${map},${fallbackZone},${db.json(polygon)}),(${map},${removedZone},${db.json(polygon)})`;
      expect((await db`SELECT jsonb_typeof(geometry) AS type FROM zone_map_areas LIMIT 1`)[0]?.type).toBe("object");
      await db`INSERT INTO zone_map_points(site_plan_id,zone_id,view,x,y) VALUES (${map},${removedZone},'top',null,null)`;

      for (const file of migrations.filter((file) => file.slice(0, 4) > "0010")) {
        await executeFile(migrationDir + "/" + file);
      }
      const facilities = await db`SELECT * FROM facilities WHERE project_id=${project} ORDER BY key`;
      expect(facilities).toHaveLength(4);
      const acc = facilities.find((row) => row.key === "acc")!;
      const tr = facilities.find((row) => row.key === "tr")!;
      expect(acc.legacy_zone_id).toBe(accZone);
      expect(tr.legacy_zone_id).toBeNull();
      expect(facilities.some((row) => row.legacy_zone_id === parent)).toBe(false);
      expect(await db`SELECT id FROM facilities WHERE key='acc'`).toHaveLength(2);
      const history = await db`SELECT id,facility_id,facility_part_id FROM site_activities ORDER BY id`;
      expect(history.map((row) => row.id).sort()).toEqual(
        [wholeActivity, partActivity, parentActivity, fallbackActivity].sort(),
      );
      expect(history.find((row) => row.id === parentActivity)?.facility_id).toBeNull();
      expect(history.find((row) => row.id === partActivity)?.facility_part_id).toBe(part);
      expect((await db`SELECT facility_id FROM zone_parts WHERE id=${part}`)[0]?.facility_id).toBe(acc.id);
      const placements =
        await db`SELECT m.*,v.key AS view_key,v.site_plan_id FROM facility_map_markers m JOIN site_map_views v ON v.id=m.site_map_view_id`;
      expect(placements.filter((row) => row.facility_id === acc.id)).toHaveLength(4);
      expect(
        placements.find((row) => row.facility_id === acc.id && row.site_plan_id === map && row.view_key === "overview")
          ?.x,
      ).toBe(0.2);
      const removedFacility = facilities.find((row) => row.legacy_zone_id === removedZone)!;
      expect(placements.some((row) => row.facility_id === removedFacility.id)).toBe(false);
      const fallbackFacility = facilities.find((row) => row.legacy_zone_id === fallbackZone)!;
      expect(placements.find((row) => row.facility_id === fallbackFacility.id)).toMatchObject({
        x: 0.3,
        y: 0.4,
        view_key: "top",
      });
      expect(
        (
          await db`SELECT image_object_key,legacy_asset_url FROM site_map_views WHERE site_plan_id=${map} AND key='top'`
        )[0],
      ).toEqual({ image_object_key: "test/master.png", legacy_asset_url: null });
      expect(
        (await db`SELECT legacy_asset_url FROM site_map_views WHERE site_plan_id=${map} AND key='overview'`)[0]
          ?.legacy_asset_url,
      ).toBeNull();

      const counts = async () =>
        (
          await db!`SELECT (SELECT count(*) FROM facilities)::int AS facilities,(SELECT count(*) FROM zone_parts)::int AS parts,(SELECT count(*) FROM facility_map_markers)::int AS markers,(SELECT count(*) FROM site_activities)::int AS activities,(SELECT count(*) FROM zone_map_areas)::int AS polygons`
        )[0];
      const before = await counts();
      await executeFile(backfillPath);
      await executeFile(backfillPath);
      expect(await counts()).toEqual(before);
      const trPart = crypto.randomUUID();
      await db`INSERT INTO zone_parts(id,facility_id,code,name) VALUES (${trPart},${tr.id},'A','TR Part without Zone or marker')`;
      await db`INSERT INTO site_activities(project_id,facility_id,facility_part_id,contractor_id,work_date,title) VALUES (${project},${tr.id},${trPart},${contractor},'2026-10-01','TR native work')`;
      expect((await db`SELECT zone_id,map_x,map_y FROM zone_parts WHERE id=${trPart}`)[0]).toEqual({
        zone_id: null,
        map_x: null,
        map_y: null,
      });
      expect((await db`SELECT zone_id FROM site_activities WHERE facility_id=${tr.id}`)[0]?.zone_id).toBeNull();
      const viewId = placements.find((row) => row.facility_id === acc.id)!.site_map_view_id;
      let duplicateCode: string | undefined;
      try {
        await db`INSERT INTO facility_map_markers(facility_id,site_map_view_id,x,y) VALUES (${acc.id},${viewId},0.1,0.2)`;
      } catch (error) {
        duplicateCode = (error as { code: string }).code;
      }
      expect(duplicateCode).toBe("23505");
      let coordinateCode: string | undefined;
      try {
        await db`INSERT INTO facility_map_markers(facility_id,site_map_view_id,x,y) VALUES (${tr.id},${viewId},1.2,0.2)`;
      } catch (error) {
        coordinateCode = (error as { code: string }).code;
      }
      expect(coordinateCode).toBe("23514");
    } finally {
      await db?.end({ timeout: 5 });
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.end({ timeout: 5 });
    }
  }, 60_000);
});
