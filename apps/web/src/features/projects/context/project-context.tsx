import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useProjects } from "../hooks/use-projects.js";

interface ProjectContextValue {
  projectId: string | null;
  setProjectId: (id: string) => void;
  projects: { id: string; code: string; name: string }[];
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);
const isPagesMock = import.meta.env.BASE_URL === "/STS-Daily-Report/";
const mockProjects = [{ id: "pages-mock", code: "STS", name: "STS Site Coordination (Mock)" }];

// Current project context shared by the topbar selector and feature screens.
// Defaults to the first active project once loaded.
export function ProjectProvider({ children }: { children: ReactNode }) {
  const query = useProjects(!isPagesMock);
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const fetchedProjects = useMemo(() => query.data?.data ?? [], [query.data]);
  const projects = isPagesMock ? mockProjects : fetchedProjects;

  const value: ProjectContextValue = {
    projectId: overrideId ?? projects[0]?.id ?? null,
    setProjectId: setOverrideId,
    projects,
    loading: !isPagesMock && query.isLoading,
  };
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useCurrentProject must be used inside ProjectProvider");
  return ctx;
}
