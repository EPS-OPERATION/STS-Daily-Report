import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/app-layout.js";
import { RouteErrorBoundary } from "@/app/router/route-error-boundary.js";
import { RequireAuth, RoleGuard, useMe } from "@/features/auth/index.js";
import { ContractorsPage } from "@/pages/contractors-page.js";
import { ContractorHomePage } from "@/pages/contractor-home-page.js";
import { DailyReportsPage } from "@/pages/daily-reports-page.js";
import { DashboardPage } from "@/pages/dashboard-page.js";
import { DevGeometryMapper } from "@/pages/dev-geometry-mapper.js";
import { FieldReportPage } from "@/pages/field-report-page.js";
import { LoginPage } from "@/pages/login-page.js";
import { NotFoundPage } from "@/pages/not-found-page.js";
import { ManpowerPage } from "@/pages/manpower-page.js";
import { PlaceholderPage } from "@/pages/placeholder-page.js";
import { WorkPermitsPage } from "@/pages/work-permits-page.js";
import { QaqcBoardPage } from "@/pages/qaqc-board-page.js";
import { SafetyPage } from "@/pages/safety-page.js";
import { SafetyReportPrintPage } from "@/pages/safety-report-page.js";
import { SitePlanPage } from "@/pages/site-plan-page.js";
import { SitePlanConfigPage } from "@/pages/site-plan-config-page.js";
import { TodayRequestsPage } from "@/pages/today-requests-page.js";

function RootIndex() {
  const me = useMe();
  if (me.isLoading) return null;
  if (me.data?.data.user.role === "contractor") {
    return <Navigate to="/field" replace />;
  }
  return <DashboardPage />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <RoleGuard allowedRoles={["eps"]} redirectTo="/field" />,
        children: [{ path: "safety/report", element: <SafetyReportPrintPage /> }],
      },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <RootIndex /> },
          // Contractor exclusive field routes
          {
            element: <RoleGuard allowedRoles={["contractor"]} redirectTo="/" />,
            children: [
              { path: "field", element: <ContractorHomePage /> },
              { path: "field/report", element: <FieldReportPage /> },
              // Legacy link from the old 5-step wizard.
              { path: "evening-report", element: <Navigate to="/field/report?shift=evening" replace /> },
            ],
          },
          // EPS management & review routes (cut out for contractors)
          {
            element: <RoleGuard allowedRoles={["eps"]} redirectTo="/field" />,
            children: [
              { path: "daily-reports", element: <DailyReportsPage /> },
              { path: "site-plan", element: <SitePlanPage /> },
              { path: "site-plan/config", element: <SitePlanConfigPage /> },
              { path: "today-requests", element: <TodayRequestsPage /> },
              { path: "today-request", element: <Navigate to="/today-requests" replace /> },
              { path: "tomorrow", element: <Navigate to="/today-requests" replace /> },
              { path: "weekly-summary", element: <Navigate to="/today-requests" replace /> },
              { path: "contractors", element: <ContractorsPage /> },
              // Dev-only geometry mapper: reachable by URL, never linked in navigation.
              { path: "dev/map-zones", element: <DevGeometryMapper /> },
              { path: "manpower", element: <ManpowerPage /> },
              { path: "work-permits", element: <WorkPermitsPage /> },
              { path: "qaqc", element: <QaqcBoardPage /> },
              { path: "safety", element: <SafetyPage /> },
              {
                path: "materials",
                element: <PlaceholderPage title="Materials" blurb="Record material deliveries, quantities and suppliers linked to daily reports." />,
              },
              {
                path: "progress",
                element: <PlaceholderPage title="Drone Progress" blurb="Compare periodic drone captures against planned progress per zone." />,
              },
          {
            path: "settings",
            element: <PlaceholderPage title="Settings" blurb="Project configuration. Authentication is handled via server sessions." />,
          },
          { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

