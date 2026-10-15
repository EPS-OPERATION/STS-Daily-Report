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
export function useCoordination(projectId: string | null, date: string) {
  return useQuery({ queryKey: coordinationKeys.day(projectId ?? "", date), queryFn: () => coordinationApi.get(projectId!, date), enabled: Boolean(projectId), refetchInterval: 10_000 });
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
