import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";

// Public server flags (login access code, trial-mode resubmit). Same cache key as the login form.
export function useAuthConfig() {
  return useQuery({ queryKey: ["auth", "config"], queryFn: () => authApi.config(), staleTime: Infinity, retry: false });
}
