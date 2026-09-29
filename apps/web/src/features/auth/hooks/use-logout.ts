import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth.api.js";
import { authKeys } from "../api/auth.keys.js";

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      queryClient.removeQueries({ queryKey: authKeys.all });
      navigate("/login", { replace: true });
    },
  });
}
