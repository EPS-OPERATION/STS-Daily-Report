import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useProjects } from "../hooks/use-projects.js";

interface ProjectContextValue {
  projectId: string | null;
  setProjectId: (id: string) => void;
  requestProjectChange: (id: string) => void;
  registerProjectChangeGuard: (guard: ((id: string) => void) | null) => () => void;
  projects: { id: string; code: string; name: string }[];
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

// Current project context shared by the topbar selector and feature screens.
// Defaults to the first active project once loaded.
export function ProjectProvider({ children }: { children: ReactNode }) {
  const query = useProjects();
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const projects = useMemo(() => query.data?.data ?? [], [query.data]);
  const projectId = overrideId ?? projects[0]?.id ?? null;
  const guardRef = useRef<((id: string) => void) | null>(null);
  const requestProjectChange = useCallback(
    (id: string) => {
      if (id === projectId) return;
      if (guardRef.current) guardRef.current(id);
      else setOverrideId(id);
    },
    [projectId],
  );
  const registerProjectChangeGuard = useCallback((guard: ((id: string) => void) | null) => {
    guardRef.current = guard;
    return () => {
      if (guardRef.current === guard) guardRef.current = null;
    };
  }, []);

  const value: ProjectContextValue = {
    projectId,
    setProjectId: setOverrideId,
    requestProjectChange,
    registerProjectChangeGuard,
    projects,
    loading: query.isLoading,
  };
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useCurrentProject must be used inside ProjectProvider");
  return ctx;
}
