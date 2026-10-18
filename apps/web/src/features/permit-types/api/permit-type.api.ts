import { http } from "@/services/http/client.js";
import type { CreatePermitTypeInput, PermitTypeItem, UpdatePermitTypeInput } from "../types/permit-type.types.js";

export const permitTypeApi = {
  list(projectId: string, includeInactive = false): Promise<{ data: PermitTypeItem[] }> {
    const q = includeInactive ? "?includeInactive=true" : "";
    return http.get<{ data: PermitTypeItem[] }>(`/projects/${projectId}/permit-types${q}`);
  },
  create(projectId: string, input: CreatePermitTypeInput): Promise<{ data: PermitTypeItem }> {
    return http.post<{ data: PermitTypeItem }>(`/projects/${projectId}/permit-types`, input);
  },
  update(projectId: string, id: string, input: UpdatePermitTypeInput): Promise<{ data: PermitTypeItem }> {
    return http.patch<{ data: PermitTypeItem }>(`/projects/${projectId}/permit-types/${id}`, input);
  },
  delete(projectId: string, id: string): Promise<void> {
    return http.delete<void>(`/projects/${projectId}/permit-types/${id}`);
  },
};
