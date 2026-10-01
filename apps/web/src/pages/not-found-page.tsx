import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state.js";

// Catch-all for unknown URLs (router `path: "*"`). Renders inside the app
// shell, unlike RouteErrorBoundary which must survive layout failures.
export function NotFoundPage() {
  return (
    <Box sx={{ maxWidth: 640, mx: "auto", mt: { xs: 4, md: 8 } }}>
      <EmptyState
        icon={<SearchOutlinedIcon />}
        title="Page not found"
        description="This address doesn't match anything — check for a typo, or pick a page from the menu."
        action={
          <Button component={RouterLink} to="/" variant="contained" size="small">
            Back to dashboard
          </Button>
        }
      />
    </Box>
  );
}
