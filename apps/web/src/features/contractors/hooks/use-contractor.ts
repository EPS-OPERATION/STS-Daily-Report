import { useQuery } from "@tanstack/react-query";
import { http } from "@/services/http/client.js";
import { contractorKeys } from "../api/contractor.keys.js";
import type { Contractor } from "../types/contractor.types.js";

export function useContractor(id: string | null) {
  return useQuery({
    queryKey: contractorKeys.detail(id ?? "none"),
    queryFn: () => http.get<{ data: Contractor }>(`/contractors/${id}`),
    enabled: Boolean(id),
  });
}
