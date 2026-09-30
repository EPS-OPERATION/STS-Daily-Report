import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useForm } from "react-hook-form";
import { useCreateContractor } from "../hooks/use-create-contractor.js";
import { contractorFormSchema, type ContractorFormValues } from "../schemas/contractor.schema.js";

export function ContractorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateContractor();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContractorFormValues>({ resolver: zodResolver(contractorFormSchema) });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    reset();
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New contractor</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {mutation.isError && (
            <Alert severity="error">
              {mutation.error instanceof Error ? mutation.error.message : "Failed to create contractor"}
            </Alert>
          )}
          <TextField
            label="Code"
            {...register("code")}
            error={Boolean(errors.code)}
            helperText={errors.code?.message}
          />
          <TextField
            label="Name"
            {...register("name")}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting || mutation.isPending}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
