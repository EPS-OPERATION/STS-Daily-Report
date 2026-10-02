import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState } from "@/components/shared/empty-state.js";
import { PageHeader } from "@/components/shared/page-header.js";

export function PlaceholderPage({ title, blurb }: { title: string; blurb: string }) {
  return (
    <Box>
      <PageHeader title={title} />
      <EmptyState
        icon={<ConstructionOutlinedIcon fontSize="large" />}
        title="Module coming soon"
        description={blurb}
        action={
          <Button component={RouterLink} to="/" variant="outlined">
            Back to dashboard
          </Button>
        }
      />
    </Box>
  );
}
