import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";
import { authKeys } from "@/consts/query-keys/auth.js";

export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: 60_000,
  });
}
