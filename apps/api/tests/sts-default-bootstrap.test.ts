import { expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getStorage } from "../src/shared/storage/index.js";
import { bootstrapStsDefault } from "../src/db/seed/sts-default.js";
import * as schema from "../src/db/schema/index.js";

const databaseUrl = process.env["DATABASE_URL"];

it.skipIf(!databaseUrl)(
  "explicit STS bootstrap is repeatable, preserves edits and unrelated data, and completes partial setup",
  async () => {
    const name = "sts_bootstrap_test_" + crypto.randomUUID().replaceAll("-", "");
    if (!/^sts_bootstrap_test_[a-f0-9]+$/.test(name)) throw new Error("Unsafe fixture database name");
    const adminUrl = new URL(databaseUrl!);
    adminUrl.pathname = "/postgres";
    const testUrl = new URL(databaseUrl!);
    testUrl.pathname = "/" + name;
    const admin = postgres(adminUrl.toString(), { max: 1 });
    const uploadedKeys = new Set<string>();
    let db: ReturnType<typeof postgres> | undefined;
    try {
      await admin.unsafe(`CREATE DATABASE "${name}"`);
      db = postgres(testUrl.toString(), { max: 1 });
      await migrate(drizzle(db), {
        migrationsFolder: fileURLToPath(new URL("../src/db/migrations/", import.meta.url)),
      });
      const storage = getStorage();
      const upload = storage.upload;
      let uploads = 0;
      let failure: unknown;
      try {
        storage.upload = async (input) => {
          uploadedKeys.add(input.key);
          if (++uploads === 2) throw new Error("Fixture upload failure");
          return upload(input);
        };
        await bootstrapStsDefault(drizzle(db, { schema }));
      } catch (error) {
        failure = error;
      } finally {
        storage.upload = upload;
      }
      expect(failure instanceof Error && failure.message).toBe("Fixture upload failure");
      expect((await db`SELECT count(*)::int AS n FROM projects`)[0]?.n).toBe(0);
      for (const key of uploadedKeys) {
        const response = await fetch(await storage.getPresignedUrl(key));
        expect(response.status).toBe(404);
        await response.body?.cancel();
      }
      const run = async (command: string, expectedExit = 0) => {
        const child = Bun.spawn([Bun.which("bun")!, "run", command], {
          cwd: fileURLToPath(new URL("../../../", import.meta.url)),
          env: { ...process.env, DATABASE_URL: testUrl.toString() },
          stdout: "pipe",
          stderr: "pipe",
        });
        const [stdout, stderr, exit] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ]);
        expect({ exit, stdout, stderr }).toMatchObject({ exit: expectedExit });
        for (const row of await db!`SELECT image_object_key FROM site_map_views WHERE image_object_key IS NOT NULL`) {
          uploadedKeys.add(row.image_object_key);
        }
        return stdout;
      };
      const snapshot = async () => ({
        projects: await db!`SELECT * FROM projects ORDER BY code`,
        maps: await db!`SELECT * FROM site_plans ORDER BY id`,
        views: await db!`SELECT * FROM site_map_views ORDER BY key`,
        facilities: await db!`SELECT * FROM facilities ORDER BY sort_order,key`,
        markers: await db!`SELECT * FROM facility_map_markers ORDER BY id`,
      });
      await run("db:seed:sts-default");
      const first = await snapshot();
      expect(first.projects).toHaveLength(1);
      expect(first.projects[0]?.name).toBe("STS 9.9 MW Biomass Power Plant");
      expect(first.maps).toHaveLength(1);
      expect(first.maps[0]).toMatchObject({ name: "Master Site Layout", is_default: true, is_active: true });
      expect(first.views).toHaveLength(2);
      expect(first.views.every((row) => row.image_object_key && row.legacy_asset_url === null)).toBe(true);
      for (const view of first.views) {
        const response = await fetch(await getStorage().getPresignedUrl(view.image_object_key));
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/png");
        const filename = view.key === "overview" ? "master-layout-map-above.png" : "master-layout-map.png";
        expect(
          Buffer.from(await response.arrayBuffer()).equals(
            Buffer.from(
              await Bun.file(new URL(`../../web/public/site-plan/${filename}`, import.meta.url)).arrayBuffer(),
            ),
          ),
        ).toBe(true);
      }
      expect(first.views.map((row) => [row.key, row.width, row.height])).toEqual([
        ["overview", 1513, 1039],
        ["top", 1586, 992],
      ]);
      expect(first.facilities).toHaveLength(15);
      expect(first.facilities.map((row) => row.key)).toEqual([
        "raw-water-pond-and-pump",
        "water-tank-and-pump-house",
        "water-treatment-plant",
        "auxiliary-cooling-tower",
        "compressor-room",
        "acc",
        "tg-building",
        "tr",
        "boiler",
        "biomass-transport",
        "bottom-ash-bunker",
        "fly-ash-silo",
        "diesel-oil-tank",
        "fgt",
        "stack",
      ]);
      expect(first.facilities.map((row) => row.name)).toEqual([
        "Raw Water Pond and Pump",
        "Water Tank and Pump House",
        "Water Treatment Plant",
        "Auxiliary Cooling Tower",
        "Compressor Room",
        "ACC",
        "TG Building",
        "TR",
        "Boiler",
        "Biomass Transport",
        "Bottom Ash Bunker",
        "Fly Ash Silo",
        "Diesel Oil Tank",
        "FGT",
        "Stack",
      ]);
      expect(first.facilities.every((row) => row.legacy_zone_id === null && row.code === null && row.is_active)).toBe(
        true,
      );
      expect(first.markers).toHaveLength(0);
      await run("db:seed:sts-default");
      expect(await snapshot()).toEqual(first);
      expect((await db`SELECT count(*)::int AS n FROM users`)[0]?.n).toBe(0);
      await run("db:seed");
      await run("db:seed");
      expect(await snapshot()).toEqual(first);
      expect((await db`SELECT count(*)::int AS n FROM users WHERE NOT can_manage_site_configuration`)[0]?.n).toBe(1);
      const top = first.views.find((row) => row.key === "top")!;
      await db`UPDATE site_map_views SET image_object_key=NULL,legacy_asset_url='/site-plan/master-layout-map.png' WHERE id=${top.id}`;
      expect(await run("db:seed:sts-default")).toContain("Images: 1 uploaded to MinIO");
      const upgraded = await snapshot();
      expect(upgraded.views.find((row) => row.id === top.id)?.image_object_key).toBeTruthy();
      expect(upgraded.views.find((row) => row.id === top.id)?.legacy_asset_url).toBeNull();
      expect(await run("db:seed:sts-default")).toContain("Images: 0 uploaded to MinIO");
      expect(await snapshot()).toEqual(upgraded);
      const other = (
        await db`INSERT INTO projects(code,name) VALUES ('OTHER','STS 9.9 MW Biomass Power Plant') RETURNING *`
      )[0]!;
      const acc = first.facilities.find((row) => row.key === "acc")!;
      const overview = first.views.find((row) => row.key === "overview")!;
      await db`UPDATE projects SET name='User-edited STS',description='Keep project edits' WHERE id=${acc.project_id}`;
      await db`UPDATE facilities SET name='ACC edited',code='USER-ACC',is_active=false,sort_order=99 WHERE id=${acc.id}`;
      await db`UPDATE site_map_views SET name='Edited overview',image_object_key=NULL,legacy_asset_url='/custom.png',sort_order=77,is_active=false WHERE id=${overview.id}`;
      await db`UPDATE site_plans SET name='Edited Master',description='Keep user edits' WHERE id=${first.maps[0]!.id}`;
      await db`INSERT INTO facility_map_markers(facility_id,site_map_view_id,x,y) VALUES (${acc.id},${overview.id},0.2,0.3)`;
      const edited = await snapshot();
      await run("db:seed:sts-default");
      expect(await snapshot()).toEqual(edited);
      expect((await db`SELECT * FROM projects WHERE id=${other.id}`)[0]).toEqual(other);
      // Partial native bootstrap: existing ACC/Overview and marker retain their IDs and edits.
      await db`DELETE FROM facilities WHERE project_id=${acc.project_id} AND id<>${acc.id}`;
      await db`DELETE FROM site_map_views WHERE site_plan_id=${overview.site_plan_id} AND id<>${overview.id}`;
      await run("db:seed:sts-default");
      const repaired = await snapshot();
      expect(repaired.facilities).toHaveLength(15);
      expect(repaired.facilities.find((row) => row.id === acc.id)).toEqual(
        edited.facilities.find((row) => row.id === acc.id),
      );
      expect(repaired.views).toHaveLength(2);
      expect(repaired.views.find((row) => row.id === overview.id)).toEqual(
        edited.views.find((row) => row.id === overview.id),
      );
      expect(repaired.maps).toEqual(edited.maps);
      expect(repaired.markers).toEqual(edited.markers);
      await run("db:seed:sts-default");
      expect(await snapshot()).toEqual(repaired);
      expect(
        (
          await db`SELECT (SELECT count(*) FROM zones)::int AS zones,(SELECT count(*) FROM zone_parts)::int AS parts,(SELECT count(*) FROM site_activities)::int AS activities,(SELECT count(*) FROM contractors)::int AS contractors,(SELECT count(*) FROM site_marker_definitions)::int AS definitions,(SELECT count(*) FROM zone_map_areas)::int AS areas`
        )[0],
      ).toEqual({ zones: 0, parts: 0, activities: 0, contractors: 0, definitions: 0, areas: 0 });
      await db`INSERT INTO site_plans(project_id,name,is_default) VALUES (${acc.project_id},'Conflicting default',true)`;
      const ambiguous = await snapshot();
      await run("db:seed:sts-default", 1);
      expect(await snapshot()).toEqual(ambiguous);
    } finally {
      for (const key of uploadedKeys) await getStorage().remove(key);
      await db?.end({ timeout: 5 });
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.end({ timeout: 5 });
    }
  },
  60_000,
);
