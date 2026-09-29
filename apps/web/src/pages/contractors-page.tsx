import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header.js";
import { ContractorDialog } from "@/features/contractors/components/contractor-form.js";
import { ContractorTable } from "@/features/contractors/components/contractor-table.js";

export function ContractorsPage() {
  const [open, setOpen] = useState(false);
  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Contractors"
        subtitle="Contractor registry backed by the live API"
        actions={<Button onClick={() => setOpen(true)}>New contractor</Button>}
      />
      <ContractorTable />
      <ContractorDialog open={open} onClose={() => setOpen(false)} />
    </Stack>
  );
}
