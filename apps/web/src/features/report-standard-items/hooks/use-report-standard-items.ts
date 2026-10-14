import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportStandardItemApi } from "../api/report-standard-item.api.js";
import { reportStandardItemKeys } from "../api/report-standard-item.keys.js";
import type { StandardItemDraft } from "../types/report-standard-item.types.js";

export function useReportStandardItems(projectId: string, contractorId: string) {
  return useQuery({
    queryKey: reportStandardItemKeys.list(projectId, contractorId),
    queryFn: async () => (await reportStandardItemApi.list(projectId, contractorId)).data,
  });
}

export function useSaveReportStandardItems(projectId: string, contractorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (items: StandardItemDraft[]) => reportStandardItemApi.merge(projectId, contractorId, items),
    onSuccess: (res) => client.setQueryData(reportStandardItemKeys.list(projectId, contractorId), res.data),
  });
}

export function useDeleteReportStandardItem(projectId: string, contractorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportStandardItemApi.remove(projectId, id),
    onSuccess: () => client.invalidateQueries({ queryKey: reportStandardItemKeys.list(projectId, contractorId) }),
  });
}
