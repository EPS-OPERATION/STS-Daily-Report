import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "../hooks/use-me.js";

// Shell guard: /login stays public, everything under the app shell requires
// a server-validated session. Memory/localStorage alone never authenticates.
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();

  if (me.isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress aria-label="Loading session" />
      </Box>
    );
  }

  if (me.isError || !me.data) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <Outlet />;
}
