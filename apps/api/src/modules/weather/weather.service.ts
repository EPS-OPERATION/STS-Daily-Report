import { DEFAULT_SITE_LOCATION, compareReportedWeather, type WeatherCondition, type WeatherHour, type WeatherVerdict } from "@sts/shared";
import { getEnv } from "@/config/env.js";
import { getDb } from "@/db/client.js";
import { pingHeartbeat } from "@/observability/heartbeat.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getProjectLocation, getSyncState, latestHour, listActiveProjectIds, listHours, listReportedWeather, upsertHours, type WeatherRow } from "./weather.repository.js";

// Recorded site weather: hourly rows kept in our DB so every screen (and every PM) sees the same numbers.
// The hourly job (weather.cron.ts / POST /internal/weather/sync) pulls every project each hour; a read
// whose data is older than FRESH_MS also pulls, as a safety net. Each pull covers the past days since the
// last stored hour (past_days), so missed hours fill themselves.
const FRESH_MS = 30 * 60_000;
const FIRST_FILL_DAYS = 31;
const MAX_PAST_DAYS = 92;
const MAX_RANGE_DAYS = 93;
const SOURCE = "open-meteo";
const OFFSET = "+07:00"; // Asia/Bangkok, no daylight saving

const inflight = new Map<string, Promise<void>>();

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: (number | null)[];
  relative_humidity_2m: (number | null)[];
  precipitation: (number | null)[];
  wind_speed_10m: (number | null)[];
  wind_gusts_10m: (number | null)[];
  weather_code: (number | null)[];
}

const round1 = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);
const bangkokMidnight = (isoDate: string) => new Date(`${isoDate}T00:00:00${OFFSET}`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

const HOURLY_VARS = "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code";

// Historical archive (ERA5 reanalysis, from 1940; the last ~5 days are not in it yet).
async function fetchOpenMeteoArchive(lat: number, lon: number, from: string, to: string): Promise<OpenMeteoHourly> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=${HOURLY_VARS}` +
    `&start_date=${from}&end_date=${to}&timezone=Asia%2FBangkok`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Open-Meteo archive ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { hourly?: OpenMeteoHourly };
  if (!body.hourly?.time) throw new Error("Open-Meteo archive: no hourly data");
  return body.hourly;
}

// Provider hours → our rows; recorded hours only, and hours the provider has no values for are skipped.
function toRows(projectId: string, h: OpenMeteoHourly, source: string, now: Date): WeatherRow[] {
  const rows: WeatherRow[] = [];
  h.time.forEach((t, i) => {
    const hour = new Date(`${t}:00${OFFSET}`);
    if (hour.getTime() > now.getTime()) return;
    if (h.temperature_2m[i] === null && h.precipitation[i] === null) return;
    rows.push({
      projectId,
      hour,
      temperatureC: round1(h.temperature_2m[i]),
      humidityPct: h.relative_humidity_2m[i] === null || h.relative_humidity_2m[i] === undefined ? null : Math.round(h.relative_humidity_2m[i]!),
      precipitationMm: round1(h.precipitation[i]),
      windKmh: round1(h.wind_speed_10m[i]),
      gustKmh: round1(h.wind_gusts_10m[i]),
      weatherCode: h.weather_code[i] ?? null,
      source,
      fetchedAt: now,
    });
  });
  return rows;
}

async function fetchOpenMeteo(lat: number, lon: number, pastDays: number): Promise<OpenMeteoHourly> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code" +
    `&past_days=${pastDays}&forecast_days=1&timezone=Asia%2FBangkok`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const body = (await res.json()) as { hourly?: OpenMeteoHourly };
  if (!body.hourly?.time) throw new Error("Open-Meteo: no hourly data");
  return body.hourly;
}

async function sync(projectId: string, lat: number, lon: number) {
  const db = getDb();
  const { lastHour } = await getSyncState(db, projectId);
  const now = new Date();
  const pastDays = lastHour
    ? Math.min(MAX_PAST_DAYS, Math.max(1, Math.ceil((now.getTime() - lastHour.getTime()) / 86_400_000) + 1))
    : FIRST_FILL_DAYS;
  const h = await fetchOpenMeteo(lat, lon, pastDays);
  const rows = toRows(projectId, h, SOURCE, now);
  await upsertHours(db, rows);
}

// Pulls new hours when the stored ones are stale. A failed pull never fails the read: stored hours are
// still returned and `stale` tells the screen the newest hours may be missing.
async function ensureFresh(projectId: string, force = false): Promise<{ stale: boolean }> {
  const db = getDb();
  const project = await getProjectLocation(db, projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  const { lastFetch } = await getSyncState(db, projectId);
  if (!force && lastFetch && Date.now() - lastFetch.getTime() < FRESH_MS) return { stale: false };
  const lat = project.latitude ?? DEFAULT_SITE_LOCATION.latitude;
  const lon = project.longitude ?? DEFAULT_SITE_LOCATION.longitude;
  let job = inflight.get(projectId);
  if (!job) {
    job = sync(projectId, lat, lon).finally(() => inflight.delete(projectId));
    inflight.set(projectId, job);
  }
  try {
    await job;
    return { stale: false };
  } catch (err) {
    console.warn("[weather] sync failed", projectId, err instanceof Error ? err.message : err);
    return { stale: true };
  }
}

const toDto = (r: Awaited<ReturnType<typeof listHours>>[number]): WeatherHour => ({
  hour: r.hour.toISOString(),
  temperatureC: r.temperatureC,
  humidityPct: r.humidityPct,
  precipitationMm: r.precipitationMm,
  windKmh: r.windKmh,
  gustKmh: r.gustKmh,
  weatherCode: r.weatherCode,
  source: r.source,
});

// Hours for the Bangkok calendar days from..to (inclusive).
export async function hourlyWeatherService(projectId: string, from: string, to: string) {
  if (from > to) throw new ValidationError("from must be on or before to");
  const start = bangkokMidnight(from);
  const end = addDays(bangkokMidnight(to), 1);
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_RANGE_DAYS) throw new ValidationError(`Pick at most ${MAX_RANGE_DAYS} days`);
  const { stale } = await ensureFresh(projectId);
  const rows = await listHours(getDb(), projectId, start, end);
  return { from, to, source: SOURCE, stale, hours: rows.map(toDto) };
}

// The recorded hour closest before `at` on that day (for filling a report); null when none is stored.
export async function weatherAtService(projectId: string, date: string, time: string) {
  const { stale } = await ensureFresh(projectId);
  const at = new Date(`${date}T${time}:00${OFFSET}`);
  const row = await latestHour(getDb(), projectId, new Date(Math.min(at.getTime(), Date.now()) + 1));
  const sameDay = row && row.hour.getTime() >= bangkokMidnight(date).getTime();
  return { stale, hour: sameDay ? toDto(row) : null };
}

// Hourly job: pull every active project now (ignores freshness). Returns which projects failed.
export async function syncAllProjectsService() {
  const ids = await listActiveProjectIds(getDb());
  const results = await Promise.all(ids.map(async (id) => ({ id, ...(await ensureFresh(id, true)) })));
  const failed = results.filter((r) => r.stale).map((r) => r.id);
  // Dead-man's switch: a missing ping means the hourly job stopped; /fail means it ran but a project failed.
  await pingHeartbeat(getEnv().WEATHER_HEARTBEAT_URL, failed.length === 0);
  return { projects: ids.length, failed, at: new Date().toISOString() };
}

const bangkokDate = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

// Benchmark: every sent morning report in from..to against the recorded hours of its day.
export async function compareWeatherService(projectId: string, from: string, to: string, contractorCodes?: string[]) {
  const hourly = await hourlyWeatherService(projectId, from, to);
  const byDay = new Map<string, WeatherHour[]>();
  for (const h of hourly.hours) {
    const day = bangkokDate(new Date(h.hour));
    byDay.set(day, [...(byDay.get(day) ?? []), h]);
  }
  const reports = (await listReportedWeather(getDb(), projectId, from, to)).filter(
    (r) => !contractorCodes?.length || contractorCodes.includes(r.contractorCode),
  );
  const rows = reports.map((r) => {
    const result = compareReportedWeather(
      { weather: (r.weather as WeatherCondition | null) ?? null, temperatureC: r.temperatureC, humidityPct: r.humidityPct, startTime: r.startTime, endTime: r.endTime },
      byDay.get(r.reportDate) ?? [],
    );
    return {
      reportId: r.reportId,
      date: r.reportDate,
      contractorCode: r.contractorCode,
      contractorName: r.contractorName,
      reported: { weather: r.weather, temperatureC: r.temperatureC, humidityPct: r.humidityPct, startTime: r.startTime, endTime: r.endTime },
      ...result,
    };
  });
  const count = (v: WeatherVerdict) => rows.filter((r) => r.verdict === v).length;
  const judged = count("match") + count("partial") + count("mismatch");
  return {
    from,
    to,
    stale: hourly.stale,
    summary: {
      reports: rows.length,
      match: count("match"),
      partial: count("partial"),
      mismatch: count("mismatch"),
      noData: count("no_data") + count("not_reported"),
      matchRate: judged ? Math.round((count("match") / judged) * 100) : null,
    },
    rows,
  };
}

// One-off history fill for a project: from..to (Bangkok days) from the archive, a month per request.
// Safe to re-run (rows are upserted). Days still missing from the archive are filled by the hourly job.
export async function backfillWeatherService(projectId: string, from: string, to: string, log: (line: string) => void = () => {}) {
  if (from > to) throw new ValidationError("from must be on or before to");
  const project = await getProjectLocation(getDb(), projectId);
  if (!project) throw new NotFoundError("Project not found", { projectId });
  const lat = project.latitude ?? DEFAULT_SITE_LOCATION.latitude;
  const lon = project.longitude ?? DEFAULT_SITE_LOCATION.longitude;
  let total = 0;
  for (let start = from; start <= to; ) {
    const monthEnd = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0)).toISOString().slice(0, 10);
    const end = monthEnd < to ? monthEnd : to;
    const rows = toRows(projectId, await fetchOpenMeteoArchive(lat, lon, start, end), "open-meteo-archive", new Date());
    await upsertHours(getDb(), rows);
    total += rows.length;
    log(`${start} → ${end}: ${rows.length} hours`);
    start = addDays(new Date(`${end}T00:00:00Z`), 1).toISOString().slice(0, 10);
  }
  return { projectId, from, to, hours: total };
}
