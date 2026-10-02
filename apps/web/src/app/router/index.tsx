import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/app-layout.js";
import { RequireAuth } from "@/features/auth/components/require-auth.js";
import { ProjectProvider } from "@/features/projects/context/project-context.js";
import { ContractorsPage } from "@/features/contractors/pages/contractors-page.js";
import { ContractorHomePage } from "@/features/field/pages/contractor-home-page.js";
import { DailyReportsPage } from "@/features/daily-reports/pages/daily-reports-page.js";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page.js";
import { EveningReportPage } from "@/features/field/pages/evening-report-page.js";
import { LoginPage } from "@/features/auth/pages/login-page.js";
import { PlaceholderPage } from "@/components/shared/placeholder-page.js";
import { ProjectsPage } from "@/features/projects/pages/projects-page.js";
import { SiteActivityPage } from "@/features/site-activity/pages/site-activity-page.js";
import { SiteConfigurationPage } from "@/features/site-configuration/pages/site-configuration-page.js";
import { TomorrowPlanPage } from "@/features/tomorrow-plan/pages/tomorrow-plan-page.js";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: (
          <ProjectProvider>
            <AppLayout />
          </ProjectProvider>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "daily-reports", element: <DailyReportsPage /> },
          { path: "site-plan", element: <SiteActivityPage /> },
          { path: "site-plan/config", element: <Navigate to="/site-configuration" replace /> },
          { path: "site-configuration", element: <SiteConfigurationPage /> },
          { path: "tomorrow", element: <TomorrowPlanPage /> },
          { path: "contractors", element: <ContractorsPage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "field", element: <ContractorHomePage /> },
          { path: "evening-report", element: <EveningReportPage /> },
          {
            path: "manpower",
            element: (
              <PlaceholderPage
                title="Manpower"
                blurb="Track workforce headcount by contractor, zone and worker type. This module follows the contractors reference pattern."
              />
            ),
          },
          {
            path: "work-permits",
            element: (
              <PlaceholderPage
                title="Work Permits"
                blurb="Issue and approve high-risk work permits with expiry and zone linkage. This module follows the contractors reference pattern."
              />
            ),
          },
          {
            path: "qaqc",
            element: (
              <PlaceholderPage
                title="QAQC"
                blurb="Manage QAQC requests, inspections and RFI status per zone and contractor."
              />
            ),
          },
          {
            path: "materials",
            element: (
              <PlaceholderPage
                title="Materials"
                blurb="Record material deliveries, quantities and suppliers linked to daily reports."
              />
            ),
          },
          {
            path: "progress",
            element: (
              <PlaceholderPage
                title="Drone Progress"
                blurb="Compare periodic drone captures against planned progress per zone."
              />
            ),
          },
          {
            path: "reports",
            element: (
              <PlaceholderPage
                title="Reports"
                blurb="Export and review consolidated operational reports across projects."
              />
            ),
          },
          {
            path: "settings",
            element: (
              <PlaceholderPage
                title="Settings"
                blurb="Project configuration. Authentication is handled via server sessions."
              />
            ),
          },
        ],
      },
    ],
  },
]);
