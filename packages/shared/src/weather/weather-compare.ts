import type { WeatherCondition } from "../report/daily-report.js";
import { weatherConditionOf, type WeatherHour } from "./weather.js";

// Contractor-reported weather vs the recorded hourly site weather (benchmark on the Rain tab).

/** Rain (mm) inside the work window that counts as "it rained during work". */
export const WORK_RAIN_MM = 0.5;
/** Rain (mm) inside the work window that a "no rain" report clearly contradicts. */
export const WORK_RAIN_CONTRADICT_MM = 2;
/** An hour with at least this much rain counts as a rain hour. */
export const RAIN_HOUR_MM = 0.2;
export const WINDY_GUST_KMH = 30;
export const STRONG_GUST_KMH = 45;
export const HOT_TEMP_C = 33;
export const TEMP_TOLERANCE_C = 3;
export const HUMIDITY_TOLERANCE_PCT = 20;

export type WeatherVerdict = "match" | "partial" | "mismatch" | "no_data" | "not_reported";
export interface WeatherCheck {
  field: "weather" | "temperature" | "humidity";
  level: "ok" | "warn" | "bad";
  message: string;
}
export interface ReportedWeather {
  weather: WeatherCondition | null;
  temperatureC: number | null;
  humidityPct: number | null;
  startTime: string | null;
  endTime: string | null;
}
export interface RecordedSummary {
  /** Working window used, e.g. "08:00–17:00". */
  window: string;
  conditionAtStart: WeatherCondition | null;
  temperatureAtStart: number | null;
  humidityAtStart: number | null;
  rainMm: number;
  rainHours: number;
  /** First–last rain hour inside the window, e.g. "13:00–15:00". */
  rainSpan: string | null;
  maxGustKmh: number;
  maxTemperatureC: number | null;
  stormHours: number;
  /** The part the morning report can speak for: start → noon (MORNING_END). */
  morning: { window: string; rainMm: number; rainHours: number; rainSpan: string | null; stormHours: number };
}

/** The morning report is sent at the start of the day: its weather is judged up to noon, later rain is information. */
export const MORNING_END_HOUR = 12;

const bangkokHour = (iso: string) => (new Date(iso).getUTCHours() + 7) % 24;
const hourOf = (hhmm: string | null, fallback: number) => (hhmm ? Number(hhmm.slice(0, 2)) : fallback);
const r1 = (n: number) => Math.round(n * 10) / 10;
const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

// Recorded weather of one Bangkok day, summarised over the report's working window (default 08:00–17:00).
export function summariseRecorded(hours: WeatherHour[], startTime: string | null, endTime: string | null): RecordedSummary | null {
  if (hours.length === 0) return null;
  const from = hourOf(startTime, 8);
  const to = Math.max(from + 1, hourOf(endTime, 17));
  const inWindow = hours.filter((h) => bangkokHour(h.hour) >= from && bangkokHour(h.hour) < to);
  if (inWindow.length === 0) return null;
  const start = hours.find((h) => bangkokHour(h.hour) === from) ?? inWindow[0]!;
  const rainy = inWindow.filter((h) => (h.precipitationMm ?? 0) >= RAIN_HOUR_MM);
  const temps = inWindow.map((h) => h.temperatureC).filter((t): t is number => t !== null);
  const mEnd = Math.min(to, Math.max(from + 1, MORNING_END_HOUR));
  const am = inWindow.filter((h) => bangkokHour(h.hour) < mEnd);
  const amRainy = am.filter((h) => (h.precipitationMm ?? 0) >= RAIN_HOUR_MM);
  return {
    morning: {
      window: `${pad(from)}–${pad(mEnd)}`,
      rainMm: r1(am.reduce((s, h) => s + (h.precipitationMm ?? 0), 0)),
      rainHours: amRainy.length,
      rainSpan: amRainy.length ? `${pad(bangkokHour(amRainy[0]!.hour))}–${pad(bangkokHour(amRainy[amRainy.length - 1]!.hour) + 1)}` : null,
      stormHours: am.filter((h) => (h.weatherCode ?? 0) >= 95).length,
    },
    window: `${pad(from)}–${pad(to)}`,
    conditionAtStart: weatherConditionOf(start),
    temperatureAtStart: start.temperatureC,
    humidityAtStart: start.humidityPct,
    rainMm: r1(inWindow.reduce((s, h) => s + (h.precipitationMm ?? 0), 0)),
    rainHours: rainy.length,
    rainSpan: rainy.length ? `${pad(bangkokHour(rainy[0]!.hour))}–${pad(bangkokHour(rainy[rainy.length - 1]!.hour) + 1)}` : null,
    maxGustKmh: r1(Math.max(0, ...inWindow.map((h) => h.gustKmh ?? 0))),
    maxTemperatureC: temps.length ? Math.max(...temps) : null,
    stormHours: inWindow.filter((h) => (h.weatherCode ?? 0) >= 95).length,
  };
}

const CONDITION_TH: Record<WeatherCondition, string> = { thunderstorm: "ฟ้าคะนอง", rain: "ฝนตก", hot: "แดดแรง", windy: "ลมแรง", normal: "ปกติ" };

function weatherCheck(said: WeatherCondition, rec: RecordedSummary): WeatherCheck[] {
  const wet = said === "rain" || said === "thunderstorm";
  const am = rec.morning;
  const amText = `ฝน ${am.rainMm} mm (${am.rainHours} ชม.${am.rainSpan ? ` ช่วง ${am.rainSpan}` : ""})`;
  const name = `«${CONDITION_TH[said]}»`;
  const pmRain = r1(rec.rainMm - am.rainMm);
  // Afternoon rain is after the morning report was sent: shown, never held against it.
  const afternoon: WeatherCheck[] =
    pmRain >= WORK_RAIN_MM ? [{ field: "weather", level: "ok", message: `ช่วงบ่ายมีฝน ${pmRain} mm (ไม่นับ)` }] : [];
  const one = (level: WeatherCheck["level"], message: string): WeatherCheck[] => [{ field: "weather", level, message }, ...afternoon];
  if (wet && am.rainMm < WORK_RAIN_MM) {
    return pmRain >= WORK_RAIN_MM
      ? [{ field: "weather", level: "warn", message: `รายงาน ${name} แต่ฝนตกช่วงบ่าย (${pmRain} mm) ไม่ใช่ช่วงเช้า ${am.window}` }]
      : one("bad", `รายงาน ${name} แต่ข้อมูลบันทึกไม่มีฝน ${am.window}`);
  }
  if (!wet && am.rainMm >= WORK_RAIN_CONTRADICT_MM) return one("bad", `รายงาน ${name} แต่บันทึก${amText}`);
  if (!wet && am.rainMm >= WORK_RAIN_MM) return one("warn", `รายงาน ${name} แต่มีฝนเล็กน้อย ${amText}`);
  if (said === "thunderstorm" && am.stormHours === 0) return one("warn", `มีฝนจริง (${amText}) แต่ไม่พบพายุฟ้าคะนองในข้อมูลบันทึก`);
  if (said === "windy" && rec.maxGustKmh < WINDY_GUST_KMH) return one("warn", `รายงาน «ลมแรง» แต่ลมกระโชกสูงสุด ${rec.maxGustKmh} km/h`);
  if (said === "hot" && rec.maxTemperatureC !== null && rec.maxTemperatureC < HOT_TEMP_C) return one("warn", `รายงาน «แดดแรง» แต่อุณหภูมิสูงสุด ${rec.maxTemperatureC}°C`);
  if (said !== "windy" && !wet && rec.maxGustKmh >= STRONG_GUST_KMH) return one("warn", `ไม่ได้รายงานลมแรง แต่ลมกระโชกถึง ${rec.maxGustKmh} km/h`);
  return one("ok", wet ? `ตรง: ${amText}` : `ตรง: ไม่มีฝนช่วงเช้า ${am.window}`);
}

// The reported condition is judged on the morning (start → noon); afternoon rain is listed as information.
// Temperature and humidity against the start hour, with a tolerance.
export function compareReportedWeather(
  reported: ReportedWeather,
  hours: WeatherHour[],
): { verdict: WeatherVerdict; recorded: RecordedSummary | null; checks: WeatherCheck[] } {
  const recorded = summariseRecorded(hours, reported.startTime, reported.endTime);
  if (!reported.weather && reported.temperatureC === null && reported.humidityPct === null) return { verdict: "not_reported", recorded, checks: [] };
  if (!recorded) return { verdict: "no_data", recorded, checks: [] };
  const checks: WeatherCheck[] = [];
  if (reported.weather) checks.push(...weatherCheck(reported.weather, recorded));
  if (reported.temperatureC !== null && recorded.temperatureAtStart !== null) {
    const diff = r1(Math.abs(reported.temperatureC - recorded.temperatureAtStart));
    checks.push(
      diff > TEMP_TOLERANCE_C
        ? { field: "temperature", level: "warn", message: `อุณหภูมิรายงาน ${reported.temperatureC}°C ต่างจากบันทึก ${recorded.temperatureAtStart}°C (${diff}°C)` }
        : { field: "temperature", level: "ok", message: `อุณหภูมิใกล้เคียง (ต่าง ${diff}°C)` },
    );
  }
  if (reported.humidityPct !== null && recorded.humidityAtStart !== null) {
    const diff = Math.abs(reported.humidityPct - recorded.humidityAtStart);
    checks.push(
      diff > HUMIDITY_TOLERANCE_PCT
        ? { field: "humidity", level: "warn", message: `ความชื้นรายงาน ${reported.humidityPct}% ต่างจากบันทึก ${recorded.humidityAtStart}% (${diff}%)` }
        : { field: "humidity", level: "ok", message: `ความชื้นใกล้เคียง (ต่าง ${diff}%)` },
    );
  }
  const verdict: WeatherVerdict = checks.some((c) => c.level === "bad") ? "mismatch" : checks.some((c) => c.level === "warn") ? "partial" : "match";
  return { verdict, recorded, checks };
}
