import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";

export function ProjectsPage() {
  return (
    <Box>
      <PageHeader title="Projects" subtitle="Project registry (project data is served by the API seed)" />
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ maxWidth: 560 }}>
            <Typography variant="h5">STS Biomass Power Plant</Typography>
            <Typography variant="body1" color="text.secondary">
              Code STS-001 · active. Contractor relationships are managed on the Contractors page,
              which is backed by the live API.
            </Typography>
            <Box>
              <Button component={RouterLink} to="/contractors" variant="outlined">
                Manage contractors
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
