import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state.js";

// Shared route error UI (router `errorElement`): render errors, loader/action
// failures. Standalone — never inside AppLayout, so it still renders when the
// layout itself is what broke.
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = isRouteErrorResponse(error) ? error.status : null;
  const title = status === 404 ? "Page not found" : "Something went wrong";
  const description =
    status === 404
      ? "This page doesn't exist or was moved. Check the address, or head back to the dashboard."
      : status !== null
        ? `The page failed to load (error ${status}). Try again — if it keeps happening, tell the EPS team what you clicked.`
        : "The page ran into a problem. Try again — if it keeps happening, tell the EPS team what you clicked.";
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
            <Button variant="contained" size="small" onClick={() => navigate(0)}>
              Try again
            </Button>
            <Button component={RouterLink} to="/" variant="outlined" size="small">
              Back to dashboard
            </Button>
          </Box>
        }
      />
      {technical ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
          Technical detail: {technical}
        </Typography>
      ) : null}
    </Box>
  );
}
