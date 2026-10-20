import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoordinationInput, RoadSegment } from "@sts/shared";
import { coordinationApi } from "../api/coordination.api.js";
export const coordinationKeys = {
  all: ["coordination"] as const,
  project: (projectId: string) => ["coordination", projectId] as const,
  day: (projectId: string, date: string) => ["coordination", projectId, date] as const,
  report: (projectId: string, date: string) => ["coordination", "report", projectId, date] as const,
  roads: (projectId: string) => ["coordination", "roads", projectId] as const,
};
// Site road register (segments). Read by everyone; EPS staff edit it.
export function useRoadSegments(projectId: string | null) {
  return useQuery({ queryKey: coordinationKeys.roads(projectId ?? ""), queryFn: () => coordinationApi.roads(projectId!), enabled: Boolean(projectId) });
}
export function useSaveRoadSegment(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { input: Omit<RoadSegment, "id">; id?: string }) => coordinationApi.saveRoad(projectId!, v.input, v.id),
    onSuccess: () => client.invalidateQueries({ queryKey: coordinationKeys.roads(projectId!) }),
  });
}
export function useDeleteRoadSegment(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => coordinationApi.removeRoad(projectId!, id), onSuccess: () => client.invalidateQueries({ queryKey: coordinationKeys.roads(projectId!) }) });
}
// The open map follows other people's changes without refetching the whole day every 10 s: it polls a tiny
// fingerprint (/coordination/version) and refetches the day only when that differs from the day's own `version`.
// A refetch can only be triggered by a poll result, so an API outage cannot turn into a tight retry loop.
export function useCoordination(projectId: string | null, date: string) {
  const day = useQuery({ queryKey: coordinationKeys.day(projectId ?? "", date), queryFn: () => coordinationApi.get(projectId!, date), enabled: Boolean(projectId) });
  const latest = useQuery({
    queryKey: [...coordinationKeys.day(projectId ?? "", date), "version"],
    queryFn: () => coordinationApi.version(projectId!, date),
    enabled: Boolean(projectId) && day.isSuccess,
    refetchInterval: 10_000,
  });
  const changed = Boolean(latest.data && day.data && latest.data.data.version !== day.data.data.version);
  useEffect(() => {
    if (changed && !day.isFetching) void day.refetch();
  }, [latest.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  return day;
}
export function useSaveCoordination(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { input: CoordinationInput; id?: string; revision?: number }) => v.id
      ? coordinationApi.update(projectId!, v.id, v.input, v.revision!) : coordinationApi.create(projectId!, v.input),
    onSuccess: () => client.invalidateQueries({ queryKey: coordinationKeys.project(projectId!) }),
  });
}
export function useDeleteCoordination(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; revision: number }) => coordinationApi.remove(projectId!, v.id, v.revision), onSuccess: () => client.invalidateQueries({ queryKey: coordinationKeys.project(projectId!) }) });
}
export function useCoordinationColor(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (v: { contractorId: string; color: string; revision: number }) => coordinationApi.color(projectId!, v.contractorId, v.color, v.revision), onSuccess: () => client.invalidateQueries({ queryKey: coordinationKeys.project(projectId!) }) });
}
export function useSaveDayNote(projectId: string | null, date: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (note: string) => coordinationApi.dayNote(projectId!, date, note), onSuccess: () => client.invalidateQueries({ queryKey: coordinationKeys.day(projectId!, date) }) });
}
export function useDayLock(projectId: string | null, date: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (locked: boolean) => coordinationApi.lock(projectId!, date, locked), onSuccess: () => client.invalidateQueries({ queryKey: coordinationKeys.day(projectId!, date) }) });
}
// Printable day report (EPS): fetched once per print tab, no polling and no retry on 403.
export function useCoordinationReport(projectId: string | null, date: string) {
  return useQuery({ queryKey: coordinationKeys.report(projectId ?? "", date), queryFn: () => coordinationApi.report(projectId!, date), enabled: Boolean(projectId), retry: false, refetchOnWindowFocus: false });
}
