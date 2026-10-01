import postgres from "postgres";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getStorage } from "../src/shared/storage/index.js";

const name = "sts_browser_test_" + crypto.randomUUID().replaceAll("-", "");
if (!/^sts_browser_test_[a-f0-9]+$/.test(name)) throw new Error("Unsafe fixture database name");
const adminUrl = new URL(process.env["DATABASE_URL"]!);
adminUrl.pathname = "/postgres";
const testUrl = new URL(process.env["DATABASE_URL"]!);
testUrl.pathname = "/" + name;
const admin = postgres(adminUrl.toString(), { max: 1 });
let db: ReturnType<typeof postgres> | undefined;
const children: ReturnType<typeof Bun.spawn>[] = [];
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  db = postgres(testUrl.toString(), { max: 1 });
  const directory = fileURLToPath(new URL("../src/db/migrations/", import.meta.url));
  for (const file of (await readdir(directory)).filter((file) => /^\d{4}.*\.sql$/.test(file)).sort()) {
    for (const statement of (await Bun.file(directory + "/" + file).text()).split("--> statement-breakpoint"))
      if (statement.trim()) await db.unsafe(statement);
  }
  // Explicit test identities only. No Project, Facility, Map, marker or Activity is seeded.
  await db`INSERT INTO users(email,display_name,can_manage_site_configuration) VALUES ('browser-manager@sts.test','Browser fixture manager',true),('browser-reader@sts.test','Browser fixture operator',false)`;
  const bun = Bun.which("bun")!;
  children.push(
    Bun.spawn([bun, "--hot", fileURLToPath(new URL("../src/index.ts", import.meta.url))], {
      env: {
        ...process.env,
        DATABASE_URL: testUrl.toString(),
        API_PORT: "3001",
        WEB_ORIGIN: "http://localhost:5174",
        SESSION_COOKIE_NAME: "sts_browser_fixture_session",
        MINIO_PUBLIC_URL: "http://localhost:9000",
      },
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  children.push(
    Bun.spawn([bun, "x", "--no-install", "vite", "--host", "0.0.0.0", "--port", "5174", "--strictPort"], {
      cwd: fileURLToPath(new URL("../../web/", import.meta.url)),
      env: { ...process.env, VITE_API_URL: "http://localhost:3001/api/v1" },
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  console.log(
    JSON.stringify({
      database: name,
      web: "http://localhost:5174",
      admin: "browser-manager@sts.test",
      operator: "browser-reader@sts.test",
    }),
  );
  console.log("Send cleanup to stdin after browser verification.");
  await new Promise<void>((resolve) => {
    process.stdin.on("data", (data) => {
      if (String(data).includes("cleanup")) resolve();
    });
  });
} finally {
  for (const child of children) child.kill();
  if (db) {
    const objects = await db`SELECT image_object_key FROM site_map_views WHERE image_object_key IS NOT NULL`;
    for (const object of objects)
      await getStorage()
        .remove(object.image_object_key)
        .catch(() => undefined);
    await db.end({ timeout: 5 });
  }
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end({ timeout: 5 });
}
process.exit(0);
