import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState } from "@/components/shared/empty-state.js";
import { CompactPageHeader } from "@/components/shared/compact-page-header.js";
import { navigationIcons, type NavigationIconKey } from "@/app/icons/navigation-icons.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";

export function PlaceholderPage({
  title,
  blurb,
  iconKey,
}: {
  title: string;
  blurb: string;
  iconKey: NavigationIconKey;
}) {
  const { projectId, projects } = useCurrentProject();
  const projectName = projects.find((project) => project.id === projectId)?.name ?? "Project";
  const Icon = navigationIcons[iconKey];
  return (
    <Box>
      <CompactPageHeader
        icon={<Icon fontSize="small" color="primary" />}
        title={title}
        items={[{ label: projectName, to: "/projects" }, { label: title }]}
      />
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
