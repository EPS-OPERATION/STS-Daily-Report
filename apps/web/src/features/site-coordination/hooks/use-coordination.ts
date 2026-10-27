import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoordinationInput, CoordinationItemType, RoadSegment } from "@sts/shared";
import type { CreateItemTypeInput, UpdateItemTypeInput } from "../types/item-type.types.js";
import { coordinationApi } from "../api/coordination.api.js";
export const coordinationKeys = {
  all: ["coordination"] as const,
  project: (projectId: string) => ["coordination", projectId] as const,
  day: (projectId: string, date: string) => ["coordination", projectId, date] as const,
  report: (projectId: string, date: string) => ["coordination", "report", projectId, date] as const,
  roads: (projectId: string) => ["coordination", "roads", projectId] as const,
  itemTypes: (projectId: string) => ["coordination", "item-types", projectId] as const,
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

// Project item catalog ("Add item" menu). Admin-only writes; the open map reads the catalog in its day payload.
export function useItemTypes(projectId: string | null) {
  return useQuery({
    queryKey: coordinationKeys.itemTypes(projectId ?? ""),
    queryFn: () => coordinationApi.itemTypes(projectId!),
    enabled: Boolean(projectId),
    select: (res) => res.data,
  });
}

function useItemTypeMutation<T>(projectId: string | null, mutationFn: (value: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: coordinationKeys.itemTypes(projectId ?? "") });
      void client.invalidateQueries({ queryKey: coordinationKeys.project(projectId ?? "") });
    },
  });
}

export function useCreateItemType(projectId: string | null) {
  return useItemTypeMutation<CreateItemTypeInput>(projectId, (input) => coordinationApi.createItemType(projectId!, input));
}

export function useUpdateItemType(projectId: string | null) {
  return useItemTypeMutation<{ id: string; input: UpdateItemTypeInput }>(projectId, ({ id, input }) => coordinationApi.updateItemType(projectId!, id, input));
}

export function useDeleteItemType(projectId: string | null) {
  return useItemTypeMutation<string>(projectId, (id) => coordinationApi.removeItemType(projectId!, id));
}

export function useReorderItemTypes(projectId: string | null) {
  return useItemTypeMutation<string[]>(projectId, (ids) => coordinationApi.reorderItemTypes(projectId!, ids));
}

export type { CoordinationItemType };
// Live updates cost server time (Vercel bills memory while the API instance stays awake), so polling is
// rationed: every 20 s, only where asked (`live`: the Map page itself — not the dashboard card or the road
// picker), and only while someone is using the page: 5 min without a pointer/key/touch stops it until the
// next interaction, which polls at once. React Query already pauses while the tab is hidden.
const POLL_MS = 20_000;
const IDLE_MS = 5 * 60_000;

/** True while the page had a pointer, key, touch or scroll in the last `idleMs`. */
function useUserActive(enabled: boolean, idleMs = IDLE_MS) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    let timer = window.setTimeout(() => setActive(false), idleMs);
    const wake = () => {
      window.clearTimeout(timer);
      setActive(true);
      timer = window.setTimeout(() => setActive(false), idleMs);
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, [enabled, idleMs]);
  return active;
}

// The open map follows other people's changes without refetching the whole day: it polls a tiny
// fingerprint (/coordination/version) and refetches the day only when that differs from the day's own `version`.
// A refetch can only be triggered by a poll result, so an API outage cannot turn into a tight retry loop.
export function useCoordination(projectId: string | null, date: string, { live = false }: { live?: boolean } = {}) {
  const day = useQuery({ queryKey: coordinationKeys.day(projectId ?? "", date), queryFn: () => coordinationApi.get(projectId!, date), enabled: Boolean(projectId) });
  const active = useUserActive(live);
  const polling = live && active && Boolean(projectId) && day.isSuccess;
  const latest = useQuery({
    queryKey: [...coordinationKeys.day(projectId ?? "", date), "version"],
    queryFn: () => coordinationApi.version(projectId!, date),
    enabled: polling,
    refetchInterval: polling ? POLL_MS : false,
  });
  // Back from idle: check right away instead of waiting a full interval.
  useEffect(() => {
    if (polling && latest.data) void latest.refetch();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
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
