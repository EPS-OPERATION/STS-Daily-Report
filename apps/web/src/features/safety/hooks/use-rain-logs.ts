import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { safetyApi, safetyKeys } from "../api/safety.api.js";
import type { RainIntensity, RainLogEntry, RainLogInput, RainStats } from "../types/rain-log.types.js";

// Rain & Delay Log, stored in the database (EPS writes). Same shape the screens used before.
export function useRainLogs(projectId: string | null, from: string, to: string) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [...safetyKeys.rainLogs(projectId ?? ""), from, to],
    queryFn: () => safetyApi.rainLogs(projectId!, from, to),
    enabled: Boolean(projectId) && from <= to,
  });
  const filtered = useMemo<RainLogEntry[]>(() => query.data?.data ?? [], [query.data]);
  const refresh = () => client.invalidateQueries({ queryKey: safetyKeys.rainLogs(projectId ?? "") });

  const save = useMutation({
    mutationFn: (v: { id?: string; input: RainLogInput }) =>
      v.id ? safetyApi.updateRainLog(projectId!, v.id, v.input) : safetyApi.createRainLog(projectId!, v.input),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => safetyApi.removeRainLog(projectId!, id), onSuccess: refresh });

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

  return {
    logs: filtered,
    stats,
    isLoading: query.isLoading,
    error: query.error ?? save.error ?? remove.error ?? null,
    saving: save.isPending || remove.isPending,
    addRainLog: (input: RainLogInput) => save.mutateAsync({ input }),
    updateRainLog: (id: string, input: RainLogInput) => save.mutateAsync({ id, input }),
    deleteRainLog: (id: string) => remove.mutateAsync(id),
  };
}
