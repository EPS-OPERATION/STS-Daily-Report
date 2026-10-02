import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { getEnv } from "@/config/env.js";

const { DATABASE_URL } = getEnv();
const client = postgres(DATABASE_URL);

async function main() {
  console.log("Applying migrations to Supabase...");
  const migrationsDir = path.resolve(import.meta.dir, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`Applying ${file}...`);
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await client.unsafe(statement);
      } catch (err: any) {
        // If already exists (e.g. enum/table/relation), skip notice
        if (
          err.code === "42P07" || // relation already exists
          err.code === "42710" || // duplicate object (type already exists)
          err.code === "42701"    // duplicate column
        ) {
          // already exists, continue
        } else {
          console.error(`Error in ${file}:`, err.message);
          throw err;
        }
      }
    }
  }

  console.log("All migrations applied successfully!");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
