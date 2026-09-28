import { RouterProvider } from "react-router-dom";
import { LocalizationProvider } from "@/app/providers/localization-provider.js";
import { QueryProvider } from "@/app/providers/query-provider.js";
import { AppThemeProvider } from "@/app/providers/theme-provider.js";
import { router } from "@/app/router/index.js";

export function App() {
  return (
    <AppThemeProvider>
      <LocalizationProvider>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </LocalizationProvider>
    </AppThemeProvider>
  );
}
