import { asc, eq } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { dailyReports } from "../src/db/schema/index.js";
import { backfillWeatherService } from "../src/modules/weather/weather.service.js";
import { listActiveProjectIds } from "../src/modules/weather/weather.repository.js";

// Operator-run history fill of weather_hourly from the Open-Meteo archive. Safe to re-run.
//   bun apps/api/scripts/backfill-weather.ts                     (each project: first daily report → yesterday)
//   bun apps/api/scripts/backfill-weather.ts --from 2026-01-01 --to 2026-10-15 [--project <uuid>]
// In Docker: docker exec sts-api bun scripts/backfill-weather.ts --from 2026-01-01
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const bangkokToday = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const fromArg = arg("from");
const to = arg("to") ?? addDays(bangkokToday(), -1);
for (const d of [fromArg, to]) if (d && !ISO.test(d)) throw new Error(`Dates must be YYYY-MM-DD (got ${d})`);

const db = getDb();
const projectIds = arg("project") ? [arg("project")!] : await listActiveProjectIds(db);
for (const projectId of projectIds) {
  let from = fromArg;
  if (!from) {
    const first = await db
      .select({ d: dailyReports.reportDate })
      .from(dailyReports)
      .where(eq(dailyReports.projectId, projectId))
      .orderBy(asc(dailyReports.reportDate))
      .limit(1);
    from = first[0]?.d ?? addDays(to, -90);
  }
  console.log(`[backfill] project ${projectId}: ${from} → ${to}`);
  const r = await backfillWeatherService(projectId, from, to, (line) => console.log(`  ${line}`));
  console.log(`[backfill] done: ${r.hours} hours stored`);
}
process.exit(0);
