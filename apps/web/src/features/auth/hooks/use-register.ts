import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";
import type { RegisterPayload } from "../types/auth.types.js";
export function useRegister() {
  return useMutation({ mutationFn: (payload: RegisterPayload) => authApi.register(payload) });
}
