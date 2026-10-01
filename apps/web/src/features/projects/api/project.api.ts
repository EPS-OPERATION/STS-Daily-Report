import { http } from "@/services/http/client.js";

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  status: string;
  description: string | null;
}

export interface ProjectContractorOption {
  id: string;
  code: string;
  name: string;
}

export const projectApi = {
  list(status: "active" | "inactive" | "all" = "active"): Promise<{ data: ProjectOption[] }> {
    return http.get<{ data: ProjectOption[] }>(`/projects?status=${status}`);
  },
  listContractors(projectId: string): Promise<{ data: ProjectContractorOption[] }> {
    return http.get<{ data: ProjectContractorOption[] }>(`/projects/${projectId}/contractors`);
  },
  save(id: string | null, input: { name: string; code: string; description?: string }) {
    return id
      ? http.patch<{ data: ProjectOption }>(`/projects/${id}`, input)
      : http.post<{ data: ProjectOption }>("/projects", input);
  },
  assignContractors(id: string, contractorIds: string[]) {
    return http.put<{ data: ProjectContractorOption[] }>(`/projects/${id}/contractors`, { contractorIds });
  },
};
