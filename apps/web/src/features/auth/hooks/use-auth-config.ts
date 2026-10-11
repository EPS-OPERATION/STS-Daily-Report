import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";
import { authKeys } from "../api/auth.keys.js";

// Public server flags (trial-mode resubmit). Same cache key as other auth pages.
export function useAuthConfig() {
  return useQuery({ queryKey: authKeys.config(), queryFn: () => authApi.config(), staleTime: Infinity, retry: false });
}
