import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";
import { authKeys } from "../api/auth.keys.js";

export function useMe(enabled = true) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.me(),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}
