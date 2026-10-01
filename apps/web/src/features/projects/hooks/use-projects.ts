import { useQuery } from "@tanstack/react-query";
import { projectApi } from "../api/project.api.js";

export const projectKeys = {
  all: ["projects"] as const,
  list: (status = "active") => [...projectKeys.all, "list", status] as const,
  contractors: (projectId: string) => [...projectKeys.all, projectId, "contractors"] as const,
};

export function useProjects(status: "active" | "inactive" | "all" = "active") {
  return useQuery({ queryKey: projectKeys.list(status), queryFn: () => projectApi.list(status), staleTime: 60_000 });
}

export function useProjectContractors(projectId: string | null) {
  return useQuery({
    queryKey: projectKeys.contractors(projectId ?? "none"),
    queryFn: () => projectApi.listContractors(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}
