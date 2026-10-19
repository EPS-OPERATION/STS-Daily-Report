import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
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
            {/* Top-right, just under the 64px topbar (clear of the user menu and of the map's bottom controls). */}
            <Toaster position="top-right" offset={{ top: 76, right: 16 }} mobileOffset={{ top: 72, right: 12, left: 12 }} richColors closeButton />
          </ProjectProvider>
        </QueryProvider>
      </LocalizationProvider>
    </AppThemeProvider>
  );
}
