import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import { CompactPageHeader } from "@/components/shared/compact-page-header.js";
import { navigationIcons } from "@/app/icons/navigation-icons.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { ContractorDialog } from "@/features/contractors/components/contractor-form.js";
import { ContractorTable } from "@/features/contractors/components/contractor-table.js";

const ContractorIcon = navigationIcons.contractors;

export function ContractorsPage() {
  const [open, setOpen] = useState(false);
  const { projectId, projects } = useCurrentProject();
  const projectName = projects.find((project) => project.id === projectId)?.name ?? "Project";
  return (
    <Stack spacing={2.5}>
      <CompactPageHeader
        icon={<ContractorIcon fontSize="small" color="primary" />}
        title="Contractors"
        items={[{ label: projectName, to: "/projects" }, { label: "Contractors" }]}
        actions={<Button onClick={() => setOpen(true)}>New contractor</Button>}
      />
      <ContractorTable />
      <ContractorDialog open={open} onClose={() => setOpen(false)} />
    </Stack>
  );
}
