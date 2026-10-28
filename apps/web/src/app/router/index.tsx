import { lazy, Suspense, type ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/app-layout.js";
import { RouteErrorBoundary } from "@/app/router/route-error-boundary.js";
import { NotFoundPage } from "@/app/router/not-found-page.js";
import { PlaceholderPage } from "@/app/router/placeholder-page.js";
import { RequireAuth, RoleGuard, useMe } from "@/features/auth/index.js";

// Each page is its own chunk: pages are imported by file path (not feature barrels) so Konva, charts and the DataGrid load on demand.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => async () => ({ Component: (await load())[name] });

const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page.js").then((m) => ({ default: m.DashboardPage })));

function RootIndex() {
  const me = useMe();
  if (me.isLoading) return null;
  if (me.data?.data.user.role === "contractor") {
    return <Navigate to="/field" replace />;
  }
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/login", lazy: page(() => import("@/features/auth/pages/login-page.js"), "LoginPage") },
  { path: "/reset-password", lazy: page(() => import("@/features/auth/pages/reset-password-page.js"), "ResetPasswordPage") },
  {
    path: "/",
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <RoleGuard allowedRoles={["eps_site", "eps_admin"]} redirectTo="/field" />,
        children: [
          { path: "safety/report", lazy: page(() => import("@/features/safety/pages/safety-report-page.js"), "SafetyReportPrintPage") },
          { path: "daily-reports/work-done/print", lazy: page(() => import("@/features/daily-reports/pages/work-done-print-page.js"), "WorkDonePrintPage") },
          { path: "daily-reports/print", lazy: page(() => import("@/features/daily-reports/pages/daily-report-print-page.js"), "DailyReportsBatchPrintPage") },
          { path: "site-coordination/report", lazy: page(() => import("@/features/site-coordination/pages/site-coordination-report-page.js"), "SiteCoordinationReportPage") },
        ],
      },
      // Printable daily report: EPS (any report) or the owning contractor (checked by the API).
      { path: "daily-reports/:reportId/print", lazy: page(() => import("@/features/daily-reports/pages/daily-report-print-page.js"), "DailyReportPrintPage") },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <RootIndex /> },
          // Contractor exclusive field routes
          {
            element: <RoleGuard allowedRoles={["contractor"]} redirectTo="/" />,
            children: [
              { path: "field", lazy: page(() => import("@/features/field/pages/contractor-home-page.js"), "ContractorHomePage") },
              { path: "field/report", lazy: page(() => import("@/features/field/pages/field-report-page.js"), "FieldReportPage") },
              { path: "field/coordination", lazy: page(() => import("@/features/site-coordination/pages/contractor-coordination-page.js"), "ContractorCoordinationPage") },
              // Legacy link from the old 5-step wizard.
              { path: "evening-report", element: <Navigate to="/field/report?shift=evening" replace /> },
            ],
          },
          // EPS management & review routes (cut out for contractors)
          {
            element: <RoleGuard allowedRoles={["eps_site", "eps_admin"]} redirectTo="/field" />,
            children: [
              { path: "daily-reports", lazy: page(() => import("@/features/daily-reports/pages/daily-reports-page.js"), "DailyReportsPage") },
              { path: "site-coordination", lazy: page(() => import("@/features/site-coordination/pages/site-coordination-page.js"), "SiteCoordinationPage") },
              { path: "site-coordination/roads", lazy: page(() => import("@/features/site-coordination/pages/road-register-page.js"), "RoadRegisterPage") },
              { path: "today-requests", lazy: page(() => import("@/features/daily-requests/pages/today-requests-page.js"), "TodayRequestsPage") },
              { path: "today-request", element: <Navigate to="/today-requests" replace /> },
              { path: "tomorrow", element: <Navigate to="/today-requests" replace /> },
              { path: "weekly-summary", element: <Navigate to="/today-requests" replace /> },
              {
                // Contractor master data, user management, and optional modules are eps_admin-only.
                element: <RoleGuard allowedRoles={["eps_admin"]} redirectTo="/" />,
                children: [
                  { path: "contractors", lazy: page(() => import("@/features/contractors/pages/contractors-page.js"), "ContractorsPage") },
                  { path: "buildings", lazy: page(() => import("@/features/buildings/pages/buildings-page.js"), "BuildingsPage") },
                  { path: "admin/users", lazy: page(() => import("@/features/users/pages/admin-users-page.js"), "AdminUsersPage") },
                  { path: "admin/usage", lazy: page(() => import("@/features/users/pages/usage-page.js"), "UsagePage") },
                  { path: "site-coordination/item-types", lazy: page(() => import("@/features/site-coordination/pages/item-types-page.js"), "ItemTypesPage") },
                  { path: "site-plan", lazy: page(() => import("@/features/site-plan/pages/site-plan-page.js"), "SitePlanPage") },
                  { path: "site-plan/config", lazy: page(() => import("@/features/site-plan/pages/site-plan-config-page.js"), "SitePlanConfigPage") },
                  { path: "materials", lazy: page(() => import("@/features/materials/pages/materials-page.js"), "MaterialsPage") },
                ],
              },
              // Dev-only geometry mapper: reachable by URL, never linked in navigation.
              { path: "dev/map-zones", lazy: page(() => import("@/features/site-plan/pages/dev-geometry-mapper.js"), "DevGeometryMapper") },
              { path: "manpower", lazy: page(() => import("@/features/manpower/pages/manpower-page.js"), "ManpowerPage") },
              { path: "work-permits", element: <Navigate to="/safety?tab=permits" replace /> },
              { path: "qaqc", lazy: page(() => import("@/features/qaqc/pages/qaqc-board-page.js"), "QaqcBoardPage") },
              { path: "safety", lazy: page(() => import("@/features/safety/pages/safety-page.js"), "SafetyPage") },
              { path: "progress", lazy: page(() => import("@/features/drone/pages/drone-progress-page.js"), "DroneProgressPage") },
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

