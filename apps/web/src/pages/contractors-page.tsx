import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ContractorDialog } from "@/features/contractors/components/contractor-form.js";
import { ContractorTable } from "@/features/contractors/components/contractor-table.js";

export function ContractorsPage() {
  const [open, setOpen] = useState(false);
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Contractors</Typography>
        <Button onClick={() => setOpen(true)}>New contractor</Button>
      </Stack>
      <ContractorTable />
      <ContractorDialog open={open} onClose={() => setOpen(false)} />
    </Stack>
  );
}
