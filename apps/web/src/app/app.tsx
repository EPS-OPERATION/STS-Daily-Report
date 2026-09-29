import { RouterProvider } from "react-router-dom";
import { LocalizationProvider } from "@/app/providers/localization-provider.js";
import { QueryProvider } from "@/app/providers/query-provider.js";
import { AppThemeProvider } from "@/app/providers/theme-provider.js";
import { router } from "@/app/router/index.js";
import { ProjectProvider } from "@/features/projects/context/project-context.js";

export function App() {
  return (
    <AppThemeProvider>
      <LocalizationProvider>
        <QueryProvider>
          <ProjectProvider>
            <RouterProvider router={router} />
          </ProjectProvider>
        </QueryProvider>
      </LocalizationProvider>
    </AppThemeProvider>
  );
}
