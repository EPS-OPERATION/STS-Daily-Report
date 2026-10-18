import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state.js";
import { SUPPORT_CONTACT } from "@/config.js";
import { reportError } from "@/lib/error-reporting.js";

// Shared route error UI (router `errorElement`): render errors, loader/action
// failures. Standalone — never inside AppLayout, so it still renders when the
// layout itself is what broke.
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = isRouteErrorResponse(error) ? error.status : null;
  // Send the failure to the error tracker (no-op when none is configured); a missing page is not an error.
  useEffect(() => {
    if (status !== 404) reportError(error);
  }, [error, status]);
  const title = status === 404 ? "Page not found" : "Something went wrong";
  const description =
    status === 404
      ? "This page doesn't exist or was moved. Check the address, or head back to the dashboard."
      : status !== null
        ? `The page failed to load (error ${status}). Try again — if it keeps happening, contact support below.`
        : "The page ran into a problem. Try again — if it keeps happening, contact support below.";
  const technical =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? (typeof error.data === "string" && error.data) || error.statusText || `Response ${error.status}`
        : null;

  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: "auto", mt: { xs: 4, md: 10 } }}>
      <EmptyState
        icon={<ErrorOutlineOutlinedIcon />}
        title={title}
        description={description}
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="contained" onClick={() => navigate(0)}>
              Try again
            </Button>
            <Button component={RouterLink} to="/" variant="outlined">
              Back to dashboard
            </Button>
          </Box>
        }
      />
      {status === 404 ? null : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          Support: Tel{" "}
          <Link href={`tel:${SUPPORT_CONTACT.tel.replace(/-/g, "")}`} underline="hover">
            {SUPPORT_CONTACT.tel}
          </Link>{" "}
          · Email{" "}
          <Link href={`mailto:${SUPPORT_CONTACT.email}`} underline="hover">
            {SUPPORT_CONTACT.email}
          </Link>
        </Typography>
      )}
      {technical ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
          Technical detail: {technical}
        </Typography>
      ) : null}
    </Box>
  );
}
