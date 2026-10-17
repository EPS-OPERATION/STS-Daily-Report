import type { WeatherCondition } from "./daily-report.js";

/** Default site location (STS 9.9 MW Biomass, Thi Wang, Thung Song) for projects without coordinates. */
export const DEFAULT_SITE_LOCATION = { latitude: 8.098, longitude: 99.668 } as const;

/** One recorded hour of site weather (model data from Open-Meteo unless `source` says otherwise). */
export interface WeatherHour {
  /** Start of the hour, ISO with offset (Asia/Bangkok). */
  hour: string;
  temperatureC: number | null;
  humidityPct: number | null;
  precipitationMm: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  weatherCode: number | null;
  source: string;
}

// WMO weather code + wind/temperature → the report's weather choice (same rule the morning form uses).
export function weatherConditionOf(h: { weatherCode: number | null; windKmh: number | null; temperatureC: number | null }): WeatherCondition {
  const code = h.weatherCode ?? 1;
  if (code >= 95) return "thunderstorm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((h.windKmh ?? 0) >= 25) return "windy";
  if (code === 0 || (h.temperatureC ?? 0) >= 34) return "hot";
  return "normal";
}

/** Thai label for a WMO weather code (dashboard / chart tooltip). */
export function weatherCodeLabel(code: number | null): string {
  if (code === null) return "-";
  if (code === 0) return "ท้องฟ้าแจ่มใส";
  if (code <= 3) return "มีเมฆบางส่วน";
  if (code <= 48) return "มีหมอก";
  if (code <= 57) return "ฝนปรอย";
  if (code <= 67) return "ฝนตก";
  if (code <= 77) return "หิมะ";
  if (code <= 82) return "ฝนตกหนัก";
  return "พายุฝนฟ้าคะนอง";
}
