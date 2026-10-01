import { sql } from "drizzle-orm";
import { getDb } from "@/db/client.js";

const source = await Bun.file(new URL("./facility-backfill.sql", import.meta.url)).text();
await getDb().transaction(async (tx) => {
  for (const statement of source.split("--> statement-breakpoint")) {
    if (statement.trim()) await tx.execute(sql.raw(statement));
  }
});
const unresolved = await getDb().execute(sql`
  SELECT id,project_id,zone_id,zone_part_id FROM site_activities WHERE facility_id IS NULL
`);
const unresolvedParts = await getDb().execute(sql`
  SELECT id,zone_id,code FROM zone_parts WHERE facility_id IS NULL
`);
console.log(JSON.stringify({ unresolvedActivities: unresolved, unresolvedParts }, null, 2));
process.exit(0);
