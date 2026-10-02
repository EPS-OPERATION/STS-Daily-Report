import { useQuery } from "@tanstack/react-query";
import { dailySiteMarkerKeys } from "@/consts/query-keys/daily-site-markers.js";
import { dailySiteMarkerApi } from "../api/daily-site-marker.api.js";

export function useDailySiteMarkers(projectId: string | null, viewId: string | null, workDate: string, enabled = true) {
  return useQuery({
    queryKey: dailySiteMarkerKeys.list(projectId ?? "none", viewId ?? "none", workDate),
    queryFn: () => dailySiteMarkerApi.list(projectId!, viewId!, workDate),
    enabled: !!projectId && !!viewId && enabled,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });
}
