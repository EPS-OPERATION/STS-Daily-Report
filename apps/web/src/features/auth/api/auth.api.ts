import { http } from "@/services/http/client.js";
import type { LoginResponse, MeResponse } from "../types/auth.types.js";

export const authApi = {
  login(email: string, accessCode?: string): Promise<LoginResponse> {
    return http.post<LoginResponse>("/auth/login", accessCode ? { email, accessCode } : { email });
  },
  config(): Promise<{ data: { accessCodeRequired: boolean; allowResubmit: boolean } }> {
    return http.get("/auth/config");
  },
  me(): Promise<MeResponse> {
    return http.get<MeResponse>("/auth/me");
  },
  logout(): Promise<{ data: { ok: boolean } }> {
    return http.post<{ data: { ok: boolean } }>("/auth/logout", {});
  },
};
