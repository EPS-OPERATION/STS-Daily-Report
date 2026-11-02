import { http } from "@/services/http/client.js";
import type { EpsManpowerPayload, EpsManpowerResponse } from "../types/eps-manpower.types.js";

export const epsManpowerApi = {
  get(projectId: string, date: string): Promise<EpsManpowerResponse> {
    return http.get(`/projects/${projectId}/eps-manpower?date=${date}`);
  },
  save(projectId: string, payload: EpsManpowerPayload): Promise<EpsManpowerResponse> {
    return http.put(`/projects/${projectId}/eps-manpower`, payload);
  },
};
