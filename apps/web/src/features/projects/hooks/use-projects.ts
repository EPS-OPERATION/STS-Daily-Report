import { useQuery } from "@tanstack/react-query";
import { projectApi } from "../api/project.api.js";
import { projectKeys } from "@/consts/query-keys/projects.js";

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
