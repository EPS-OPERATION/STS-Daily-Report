import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";

export function ProjectsPage() {
  return (
    <Box>
      <PageHeader title="Projects" subtitle="Project registry (project data is served by the API seed)" />
      <EmptyState
        icon={<FolderOpenOutlinedIcon fontSize="large" />}
        title="STS Biomass Power Plant"
        description="Code STS-001 · active. Contractor relationships are managed on the Contractors page, which is backed by the live API."
        action={
          <Button component={RouterLink} to="/contractors" variant="outlined">
            Manage contractors
          </Button>
        }
      />
    </Box>
  );
}
