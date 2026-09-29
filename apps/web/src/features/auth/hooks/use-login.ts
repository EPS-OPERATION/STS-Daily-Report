import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth.api.js";
import { authKeys } from "../api/auth.keys.js";

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  return useMutation({
    mutationFn: (email: string) => authApi.login(email),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
      const redirect = params.get("redirect");
      navigate(redirect && redirect.startsWith("/") ? redirect : "/", { replace: true });
    },
  });
}
