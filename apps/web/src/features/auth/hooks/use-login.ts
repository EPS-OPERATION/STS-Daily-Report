import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth.api.js";
import { authKeys } from "../api/auth.keys.js";
import type { LoginPayload } from "../types/auth.types.js";

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  return useMutation({
    mutationFn: (v: LoginPayload) => authApi.login(v),
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: authKeys.me(), queryFn: () => authApi.me() });
      const redirect = params.get("redirect");
      navigate(redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/", { replace: true });
    },
  });
}
