import { useQuery } from "@tanstack/react-query";
import { projectApi } from "../api/project.api.js";

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  contractors: (projectId: string) => [...projectKeys.all, projectId, "contractors"] as const,
};

export function useProjects(enabled = true) {
  return useQuery({ queryKey: projectKeys.list(), queryFn: () => projectApi.list(), enabled, staleTime: 60_000 });
}

export function useProjectContractors(projectId: string | null) {
  return useQuery({
    queryKey: projectKeys.contractors(projectId ?? "none"),
    queryFn: () => projectApi.listContractors(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}
