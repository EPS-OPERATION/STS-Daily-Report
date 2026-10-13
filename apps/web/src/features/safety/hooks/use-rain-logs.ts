import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SEED_RAIN_LOGS } from "../data/seed-rain-logs.js";
import type { RainIntensity, RainLogEntry, RainLogInput, RainStats } from "../types/rain-log.types.js";

const STORAGE_PREFIX = "sts_rain_logs_v1_";
const SITE_COORD = { lat: 8.098, lon: 99.668 };

export function useRainLogs(projectId: string | null, from?: string, to?: string) {
  const key = `${STORAGE_PREFIX}${projectId ?? "default"}`;

  const [logs, setLogs] = useState<RainLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as RainLogEntry[];
    } catch {
      // ignore
    }
    return SEED_RAIN_LOGS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(logs));
    } catch {
      // ignore
    }
  }, [key, logs]);

  // Filter by date range
  const filtered = useMemo(() => {
    return logs
      .filter((l) => {
        if (from && l.date < from) return false;
        if (to && l.date > to) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  }, [logs, from, to]);

  // Aggregate statistics
  const stats = useMemo<RainStats>(() => {
    const uniqueDates = new Set(filtered.map((l) => l.date));
    const totalHours = filtered.reduce((sum, l) => sum + (l.stoppageHours || 0), 0);
    const heavyEvents = filtered.filter((l) => l.intensity === "heavy" || l.intensity === "storm").length;

    // Group by date
    const dateMap = new Map<string, { stoppageHours: number; rainfallMm: number; entries: RainLogEntry[] }>();
    const actMap = new Map<string, number>();

    filtered.forEach((entry) => {
      const cur = dateMap.get(entry.date) ?? { stoppageHours: 0, rainfallMm: 0, entries: [] };
      cur.stoppageHours += entry.stoppageHours || 0;
      cur.rainfallMm = Math.max(cur.rainfallMm, entry.rainfallMm ?? 0);
      cur.entries.push(entry);
      dateMap.set(entry.date, cur);

      (entry.affectedActivities ?? []).forEach((act) => {
        actMap.set(act, (actMap.get(act) ?? 0) + 1);
      });
    });

    let maxHours = 0;
    dateMap.forEach((v) => {
      if (v.stoppageHours > maxHours) maxHours = v.stoppageHours;
    });

    let topAct: string | null = null;
    let topCount = 0;
    actMap.forEach((cnt, act) => {
      if (cnt > topCount) {
        topCount = cnt;
        topAct = act;
      }
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    const byDate = sortedDates.map((d) => {
      const val = dateMap.get(d)!;
      const highestIntensity: RainIntensity = val.entries.some((e) => e.intensity === "storm")
        ? "storm"
        : val.entries.some((e) => e.intensity === "heavy")
          ? "heavy"
          : val.entries.some((e) => e.intensity === "moderate")
            ? "moderate"
            : "light";

      return {
        date: d,
        label: dayjs(d).format("D MMM"),
        stoppageHours: Number(val.stoppageHours.toFixed(1)),
        rainfallMm: val.rainfallMm,
        intensity: highestIntensity,
        entries: val.entries,
      };
    });

    return {
      totalRainyDays: uniqueDates.size,
      totalStoppageHours: Number(totalHours.toFixed(1)),
      heavyRainEvents: heavyEvents,
      maxStoppageHoursInDay: Number(maxHours.toFixed(1)),
      mostAffectedActivity: topAct,
      byDate,
    };
  }, [filtered]);

  const addRainLog = useCallback((input: RainLogInput) => {
    const entry: RainLogEntry = {
      ...input,
      id: `rain-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLogs((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateRainLog = useCallback((id: string, input: RainLogInput) => {
    setLogs((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...input,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }, []);

  const deleteRainLog = useCallback((id: string) => {
    setLogs((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Fetch actual historical or current precipitation from Open-Meteo for the site
  const fetchWeatherForDate = useCallback(async (dateIso: string) => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${SITE_COORD.lat}&longitude=${SITE_COORD.lon}` +
        `&daily=weather_code,precipitation_sum&timezone=Asia%2FBangkok&start_date=${dateIso}&end_date=${dateIso}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const precipitation = data.daily?.precipitation_sum?.[0] ?? 0;
      const weatherCode = data.daily?.weather_code?.[0] ?? 0;

      let intensity: "light" | "moderate" | "heavy" | "storm" = "light";
      if (weatherCode >= 95) intensity = "storm";
      else if (precipitation >= 35 || weatherCode >= 80) intensity = "heavy";
      else if (precipitation >= 10 || (weatherCode >= 61 && weatherCode <= 67)) intensity = "moderate";

      return {
        rainfallMm: Math.round(precipitation),
        intensity,
        weatherCode,
      };
    } catch {
      return null;
    }
  }, []);

  return {
    logs: filtered,
    allLogs: logs,
    stats,
    addRainLog,
    updateRainLog,
    deleteRainLog,
    fetchWeatherForDate,
  };
}
