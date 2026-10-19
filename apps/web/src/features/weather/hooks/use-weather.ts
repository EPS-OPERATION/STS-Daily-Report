import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "../api/weather.api.js";
import { weatherKeys } from "../api/weather.keys.js";

// Recorded hours change at most hourly; the API refreshes from the provider when they are stale.
const STALE = 10 * 60_000;

export function useHourlyWeather(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: weatherKeys.hourly(projectId ?? "", from, to),
    queryFn: () => weatherApi.hourly(projectId!, from, to),
    enabled: Boolean(projectId),
    staleTime: STALE,
  });
}

/** Weather right now (15-min model data) for today's morning form; refreshed every 10 minutes while open. */
export function useWeatherNow(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: weatherKeys.now(projectId ?? ""),
    queryFn: () => weatherApi.now(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 1,
  });
}

/** The recorded hour at (or just before) date + time, for filling a report. */
export function useWeatherAt(projectId: string | null, date: string, time: string) {
  return useQuery({
    queryKey: weatherKeys.at(projectId ?? "", date, time),
    queryFn: () => weatherApi.at(projectId!, date, time),
    enabled: Boolean(projectId),
    staleTime: STALE,
    retry: 1,
  });
}

/** Contractor-reported weather vs recorded hours, one row per sent morning report. */
export function useWeatherCompare(projectId: string | null, from: string, to: string, contractors?: string[]) {
  return useQuery({
    queryKey: weatherKeys.compare(projectId ?? "", from, to, (contractors ?? []).join(",")),
    queryFn: () => weatherApi.compare(projectId!, from, to, contractors),
    enabled: Boolean(projectId) && from <= to,
    staleTime: STALE,
  });
}
