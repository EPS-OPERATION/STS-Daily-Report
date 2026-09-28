import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/app-layout.js";
import { ContractorsPage } from "@/pages/contractors-page.js";
import { ContractorHomePage } from "@/pages/contractor-home-page.js";
import { DailyReportsPage } from "@/pages/daily-reports-page.js";
import { DashboardPage } from "@/pages/dashboard-page.js";
import { EveningReportPage } from "@/pages/evening-report-page.js";
import { PlaceholderPage } from "@/pages/placeholder-page.js";
import { ProjectsPage } from "@/pages/projects-page.js";
import { SitePlanPage } from "@/pages/site-plan-page.js";
import { TomorrowPlanPage } from "@/pages/tomorrow-plan-page.js";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "daily-reports", element: <DailyReportsPage /> },
      { path: "site-plan", element: <SitePlanPage /> },
      { path: "tomorrow", element: <TomorrowPlanPage /> },
      { path: "contractors", element: <ContractorsPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "field", element: <ContractorHomePage /> },
      { path: "evening-report", element: <EveningReportPage /> },
      {
        path: "manpower",
        element: <PlaceholderPage title="Manpower" blurb="Track workforce headcount by contractor, zone and worker type. This module follows the contractors reference pattern." />,
      },
      {
        path: "work-permits",
        element: <PlaceholderPage title="Work Permits" blurb="Issue and approve high-risk work permits with expiry and zone linkage. This module follows the contractors reference pattern." />,
      },
      {
        path: "qaqc",
        element: <PlaceholderPage title="QAQC" blurb="Manage QAQC requests, inspections and RFI status per zone and contractor." />,
      },
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
        element: <PlaceholderPage title="Settings" blurb="Project configuration, users and roles. Authentication lands here later." />,
      },
    ],
  },
]);
