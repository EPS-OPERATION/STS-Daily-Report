import { http } from "@/services/http/client.js";
import type { CompanyUser, Contractor, ContractorFilters, ContractorInput, ContractorListResponse, ContractorUpdate } from "../types/contractor.types.js";

export const contractorApi = {
  getAll(filters: ContractorFilters): Promise<ContractorListResponse> {
    const params = new URLSearchParams({
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.search) params.set("search", filters.search);
    if (filters.projectId) params.set("projectId", filters.projectId);
    return http.get<ContractorListResponse>(`/contractors?${params.toString()}`);
  },
  create(input: ContractorInput): Promise<{ data: Contractor }> {
    return http.post<{ data: Contractor }>("/contractors", input);
  },
  users(contractorId: string, projectId?: string): Promise<{ data: CompanyUser[] }> {
    const params = new URLSearchParams({ contractorId, page: "1", pageSize: "100" });
    if (projectId) params.set("projectId", projectId);
    return http.get<{ data: CompanyUser[] }>(`/users?${params.toString()}`);
  },
  update(id: string, input: ContractorUpdate): Promise<{ data: Contractor }> {
    return http.patch<{ data: Contractor }>(`/contractors/${id}`, input);
  },
};
