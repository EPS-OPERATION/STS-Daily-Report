import { http } from "@/services/http/client.js";
import type { Contractor, ContractorFilters, ContractorListResponse } from "../types/contractor.types.js";

export const contractorApi = {
  getAll(filters: ContractorFilters): Promise<ContractorListResponse> {
    const params = new URLSearchParams({
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.search) params.set("search", filters.search);
    return http.get<ContractorListResponse>(`/contractors?${params.toString()}`);
  },
  create(input: { code: string; name: string }): Promise<{ data: Contractor }> {
    return http.post<{ data: Contractor }>("/contractors", input);
  },
};
