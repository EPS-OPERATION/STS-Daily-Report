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
import { DroneProgressPage } from "@/pages/drone-progress-page.js";
import { ManpowerPage } from "@/pages/manpower-page.js";
import { MaterialsPage } from "@/pages/materials-page.js";
import { PlaceholderPage } from "@/pages/placeholder-page.js";
import { WorkPermitsPage } from "@/pages/work-permits-page.js";
import { QaqcBoardPage } from "@/pages/qaqc-board-page.js";
import { SafetyPage } from "@/pages/safety-page.js";
import { SafetyReportPrintPage } from "@/pages/safety-report-page.js";
import { SitePlanPage } from "@/pages/site-plan-page.js";
import { SitePlanConfigPage } from "@/pages/site-plan-config-page.js";
import { ContractorCoordinationPage } from "@/pages/contractor-coordination-page.js";
import { PagesMockFieldReportPage } from "@/pages/pages-mock-field-report-page.js";
import { TodayRequestsPage } from "@/pages/today-requests-page.js";


function RootIndex() {
  const me = useMe();
  if (me.isLoading) return null;
  if (me.data?.data.user.role === "contractor") {
    return <Navigate to="/field" replace />;
  }
  return <DashboardPage />;
}


const appRoutes = [
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
              { path: "field/coordination", element: <ContractorCoordinationPage /> },
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
              { path: "materials", element: <MaterialsPage /> },
              { path: "progress", element: <DroneProgressPage /> },
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
];

const isPagesMock = import.meta.env.BASE_URL === "/STS-Daily-Report/";

export const router = createBrowserRouter(
  isPagesMock
    ? [
        {
          path: "/",
          element: <AppLayout />,
          children: [
            { index: true, element: <Navigate to="/field" replace /> },
            { path: "field", element: <ContractorHomePage /> },
            { path: "field/report", element: <PagesMockFieldReportPage /> },
            { path: "field/coordination", element: <ContractorCoordinationPage /> },
            { path: "daily-reports", element: <Navigate to="/field/report" replace /> },
            { path: "work-permits", element: <Navigate to="/field" replace /> },
            { path: "*", element: <Navigate to="/field" replace /> },
          ],
        },
      ]
    : appRoutes,
  { basename: import.meta.env.BASE_URL },
);
