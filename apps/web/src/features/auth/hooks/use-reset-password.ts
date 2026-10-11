import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";
export function useResetPassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { token: string; password: string }) => authApi.resetPassword(input.token, input.password),
    onSuccess: () => client.clear(),
  });
}
