import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";

export function useLinkRequest() {
  return useMutation({
    mutationFn: (contractorId: string) => authApi.linkRequest(contractorId),
  });
}
