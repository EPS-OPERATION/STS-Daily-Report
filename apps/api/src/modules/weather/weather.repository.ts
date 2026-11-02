import { and, asc, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { contractors, dailyReports, projects, weatherHourly } from "@/db/schema/index.js";

export type WeatherRow = typeof weatherHourly.$inferInsert;

export async function getProjectLocation(db: Db, projectId: string) {
  const rows = await db
    .select({ id: projects.id, latitude: projects.latitude, longitude: projects.longitude })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return rows[0] ?? null;
}

// Newest stored hour and when this project's weather was last fetched (null when nothing is stored yet).
export async function getSyncState(db: Db, projectId: string) {
  const rows = await db
    .select({ lastHour: sql<Date | null>`max(${weatherHourly.hour})`, lastFetch: sql<Date | null>`max(${weatherHourly.fetchedAt})` })
    .from(weatherHourly)
    .where(eq(weatherHourly.projectId, projectId));
  const r = rows[0];
  return { lastHour: r?.lastHour ? new Date(r.lastHour) : null, lastFetch: r?.lastFetch ? new Date(r.lastFetch) : null };
}

export async function upsertHours(db: Db, rows: WeatherRow[]) {
  if (rows.length === 0) return;
  await db
    .insert(weatherHourly)
    .values(rows)
    .onConflictDoUpdate({
      target: [weatherHourly.projectId, weatherHourly.hour],
      set: {
        temperatureC: sql`excluded.temperature_c`,
        humidityPct: sql`excluded.humidity_pct`,
        precipitationMm: sql`excluded.precipitation_mm`,
        windKmh: sql`excluded.wind_kmh`,
        gustKmh: sql`excluded.gust_kmh`,
        weatherCode: sql`excluded.weather_code`,
        source: sql`excluded.source`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });
}

export async function listHours(db: Db, projectId: string, from: Date, to: Date) {
  return db
    .select()
    .from(weatherHourly)
    .where(and(eq(weatherHourly.projectId, projectId), gte(weatherHourly.hour, from), lt(weatherHourly.hour, to)))
    .orderBy(asc(weatherHourly.hour));
}

export async function latestHour(db: Db, projectId: string, before: Date) {
  const rows = await db
    .select()
    .from(weatherHourly)
    .where(and(eq(weatherHourly.projectId, projectId), lt(weatherHourly.hour, before)))
    .orderBy(desc(weatherHourly.hour))
    .limit(1);
  return rows[0] ?? null;
}

export async function listActiveProjectIds(db: Db) {
  const rows = await db.select({ id: projects.id }).from(projects).where(eq(projects.status, "active"));
  return rows.map((p) => p.id);
}

// Sent morning reports in the date range with what the contractor reported about the weather.
export async function listReportedWeather(db: Db, projectId: string, from: string, to: string) {
  return db
    .select({
      reportId: dailyReports.id,
      reportDate: dailyReports.reportDate,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      weather: dailyReports.weather,
      temperatureC: dailyReports.temperatureC,
      humidityPct: dailyReports.humidityPct,
      startTime: dailyReports.startTime,
      endTime: dailyReports.endTime,
    })
    .from(dailyReports)
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(and(eq(dailyReports.projectId, projectId), eq(dailyReports.morningStatus, "submitted"), gte(dailyReports.reportDate, from), lte(dailyReports.reportDate, to)))
    .orderBy(desc(dailyReports.reportDate), asc(contractors.code));
}
