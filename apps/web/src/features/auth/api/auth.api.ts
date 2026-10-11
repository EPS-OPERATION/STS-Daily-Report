import { http } from "@/services/http/client.js";
import type { PaginatedResponse } from "@sts/shared";
import type { ContractorOption, LoginPayload, LoginResponse, MeResponse, RegisterPayload } from "../types/auth.types.js";

export const authApi = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return http.post<LoginResponse>("/auth/login", payload);
  },
  config(): Promise<{ data: { accessCodeRequired: boolean; demoLoginEnabled: boolean; allowResubmit: boolean } }> {
    return http.get("/auth/config");
  },
  me(): Promise<MeResponse> {
    return http.get<MeResponse>("/auth/me");
  },
  logout(): Promise<{ data: { ok: boolean } }> {
    return http.post<{ data: { ok: boolean } }>("/auth/logout", {});
  },
  register(payload: RegisterPayload): Promise<{ data: { status: "pending" } }> {
    return http.post("/auth/register", payload);
  },
  resetPassword(token: string, password: string): Promise<{ data: { ok: boolean } }> {
    return http.post("/auth/reset-password", { token, password });
  },
  contractors(search: string): Promise<PaginatedResponse<ContractorOption>> {
    return http.get(`/auth/registration-options?${new URLSearchParams({ page: "1", pageSize: "100", search })}`);
  },
};
