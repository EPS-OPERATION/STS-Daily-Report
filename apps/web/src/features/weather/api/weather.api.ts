import type { RecordedSummary, WeatherCheck, WeatherHour, WeatherVerdict } from "@sts/shared";
import { http } from "@/services/http/client.js";

export interface HourlyWeather { from: string; to: string; source: string; stale: boolean; hours: WeatherHour[] }

export interface WeatherCompareRow {
  reportId: string;
  date: string;
  contractorCode: string;
  contractorName: string;
  reported: { weather: string | null; temperatureC: number | null; humidityPct: number | null; startTime: string | null; endTime: string | null };
  verdict: WeatherVerdict;
  recorded: RecordedSummary | null;
  checks: WeatherCheck[];
}
export interface WeatherCompare {
  from: string;
  to: string;
  stale: boolean;
  summary: { reports: number; match: number; partial: number; mismatch: number; noData: number; matchRate: number | null };
  rows: WeatherCompareRow[];
}

export const weatherApi = {
  compare(projectId: string, from: string, to: string, contractors?: string[]): Promise<{ data: WeatherCompare }> {
    const c = contractors?.length ? `&contractors=${encodeURIComponent(contractors.join(","))}` : "";
    return http.get(`/projects/${projectId}/weather/compare?from=${from}&to=${to}${c}`);
  },
  hourly(projectId: string, from: string, to: string): Promise<{ data: HourlyWeather }> {
    return http.get(`/projects/${projectId}/weather/hourly?from=${from}&to=${to}`);
  },
  at(projectId: string, date: string, time: string): Promise<{ data: { stale: boolean; hour: WeatherHour | null } }> {
    return http.get(`/projects/${projectId}/weather/at?date=${date}&time=${time}`);
  },
};
