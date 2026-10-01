import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "../hooks/use-me.js";

// Role-based route guard: verifies if current user has an allowed role.
export function RoleGuard({
  allowedRoles,
  redirectTo,
}: {
  allowedRoles: ("contractor" | "eps")[];
  redirectTo: string;
}) {
  const me = useMe();

  if (me.isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const role = me.data?.data.user.role ?? "contractor";
  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
