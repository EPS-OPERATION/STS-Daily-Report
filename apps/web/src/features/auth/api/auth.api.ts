import { http } from "@/services/http/client.js";
import type { LoginResponse, MeResponse } from "../types/auth.types.js";

export const authApi = {
  login(email: string): Promise<LoginResponse> {
    return http.post<LoginResponse>("/auth/login", { email });
  },
  me(): Promise<MeResponse> {
    return http.get<MeResponse>("/auth/me");
  },
  logout(): Promise<{ data: { ok: boolean } }> {
    return http.post<{ data: { ok: boolean } }>("/auth/logout", {});
  },
};
