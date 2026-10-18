import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { inspectionRequestApi, inspectionRequestKeys } from "../api/inspection-request.api.js";

export function useInspectionRequests(
  projectId: string | null,
  filters: { from: string; to: string; by: "inspection" | "report" },
) {
  return useQuery({
    queryKey: inspectionRequestKeys.requests(projectId ?? "", filters),
    queryFn: () => inspectionRequestApi.requests(projectId!, filters),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}
