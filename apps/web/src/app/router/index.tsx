import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/app-layout.js";
import { RequireAuth } from "@/features/auth/components/require-auth.js";
import { ContractorsPage } from "@/pages/contractors-page.js";
import { ContractorHomePage } from "@/pages/contractor-home-page.js";
import { DailyReportsPage } from "@/pages/daily-reports-page.js";
import { DashboardPage } from "@/pages/dashboard-page.js";
import { DevGeometryMapper } from "@/pages/dev-geometry-mapper.js";
import { FieldReportPage } from "@/pages/field-report-page.js";
import { LoginPage } from "@/pages/login-page.js";
import { PlaceholderPage } from "@/pages/placeholder-page.js";
import { ProjectsPage } from "@/pages/projects-page.js";
import { QaqcBoardPage } from "@/pages/qaqc-board-page.js";
import { SitePlanPage } from "@/pages/site-plan-page.js";
import { SitePlanConfigPage } from "@/pages/site-plan-config-page.js";
import { TomorrowPlanPage } from "@/pages/tomorrow-plan-page.js";
import { WeeklyBuildingSummaryPage } from "@/pages/weekly-building-summary-page.js";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "daily-reports", element: <DailyReportsPage /> },
          { path: "site-plan", element: <SitePlanPage /> },
          { path: "site-plan/config", element: <SitePlanConfigPage /> },
          { path: "tomorrow", element: <TomorrowPlanPage /> },
          { path: "contractors", element: <ContractorsPage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "field", element: <ContractorHomePage /> },
          { path: "field/report", element: <FieldReportPage /> },
          // Legacy link from the old 5-step wizard.
          { path: "evening-report", element: <Navigate to="/field/report?shift=evening" replace /> },
          { path: "weekly-summary", element: <WeeklyBuildingSummaryPage /> },
          // Dev-only geometry mapper: reachable by URL, never linked in navigation.
          { path: "dev/map-zones", element: <DevGeometryMapper /> },
          {
            path: "manpower",
            element: <PlaceholderPage title="Manpower" blurb="Track workforce headcount by contractor, zone and worker type. This module follows the contractors reference pattern." />,
          },
          {
            path: "work-permits",
            element: <PlaceholderPage title="Work Permits" blurb="Issue and approve high-risk work permits with expiry and zone linkage. This module follows the contractors reference pattern." />,
          },
          { path: "qaqc", element: <QaqcBoardPage /> },
          {
            path: "materials",
            element: <PlaceholderPage title="Materials" blurb="Record material deliveries, quantities and suppliers linked to daily reports." />,
          },
          {
            path: "progress",
            element: <PlaceholderPage title="Drone Progress" blurb="Compare periodic drone captures against planned progress per zone." />,
          },
          {
            path: "reports",
            element: <PlaceholderPage title="Reports" blurb="Export and review consolidated operational reports across projects." />,
          },
          {
            path: "settings",
            element: <PlaceholderPage title="Settings" blurb="Project configuration. Authentication is handled via server sessions." />,
          },
        ],
      },
    ],
  },
]);
