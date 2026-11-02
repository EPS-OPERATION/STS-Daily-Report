import { http } from "@/services/http/client.js";

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface ProjectContractorOption {
  id: string;
  code: string;
  name: string;
  /** Colour EPS set for this company on the coordination map. */
  color: string | null;
}

export const projectApi = {
  list(): Promise<{ data: ProjectOption[] }> {
    return http.get<{ data: ProjectOption[] }>("/projects");
  },
  listContractors(projectId: string): Promise<{ data: ProjectContractorOption[] }> {
    return http.get<{ data: ProjectContractorOption[] }>(`/projects/${projectId}/contractors`);
  },
};
