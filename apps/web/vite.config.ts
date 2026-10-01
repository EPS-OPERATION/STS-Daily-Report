import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": "/src" },
    // Single-copy enforcement: bun's peer resolution can install duplicate
    // @mui/@emotion copies (see node_modules/.bun). Without dedupe, Vite may
    // bundle two runtimes and ThemeContext splits — pages render with default
    // MUI values (Roboto, #1976D2, uppercase) instead of the app theme.
    // NOTE: only packages present at the workspace root may be listed here;
    // forcing a non-existent top-level copy (e.g. @mui/system) breaks the
    // production Rollup build.
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled", "@mui/material"],
  },
  server: { port: 5173 },
});
