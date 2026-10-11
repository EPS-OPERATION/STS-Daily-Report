import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Controller, useForm } from "react-hook-form";
import { ContractorPicker } from "@/features/auth/components/contractor-picker.js";
import { useDecideUser } from "../hooks/use-users.js";
import { approveUserSchema, rejectUserSchema } from "../schemas/user.schema.js";
import type { ManagedUser } from "../types/user.types.js";

export function UserDecisionDialog({ user, action, onClose, projectId }: { user: ManagedUser; action: "approve" | "reject"; onClose: () => void; projectId?: string }) {
  const mutation = useDecideUser();
  const approval = useForm<{ contractorChoice: string }>({ resolver: zodResolver(approveUserSchema), defaultValues: { contractorChoice: user.requestedContractorId ?? "other" } });
  const rejection = useForm<{ reason: string }>({ resolver: zodResolver(rejectUserSchema), defaultValues: { reason: "" } });
  const submit = action === "approve" ? approval.handleSubmit(async (v) => {
    try { await mutation.mutateAsync({ id: user.id, action, contractorId: v.contractorChoice === "other" ? undefined : v.contractorChoice, projectId }); onClose(); } catch { /* Displayed in the dialog. */ }
  }) : rejection.handleSubmit(async (v) => {
    try { await mutation.mutateAsync({ id: user.id, action, reason: v.reason }); onClose(); } catch { /* Displayed in the dialog. */ }
  });
  return <Dialog open onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm">
    <form onSubmit={(event) => { event.stopPropagation(); void submit(event); }} noValidate>
      <DialogTitle>{action === "approve" ? "Approve account" : "Reject account"}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>{user.email} · {user.username}</Typography>
        {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
        {action === "approve" ? <>
          <Controller name="contractorChoice" control={approval.control} render={({ field }) => <ContractorPicker value={field.value} onChange={field.onChange} selectedName={user.requestedContractorName ?? undefined} allowOther={!user.requestedContractorId} projectId={projectId} error={approval.formState.errors.contractorChoice?.message} disabled={mutation.isPending} />} />
          {approval.watch("contractorChoice") === "other" && <Alert severity="info">{user.requestedCompanyName} — approve the account without a contractor membership. Reporting stays unavailable until it is linked to a contractor.</Alert>}
        </> : <TextField label="Rejection reason" multiline minRows={3} {...rejection.register("reason")} error={Boolean(rejection.formState.errors.reason)} helperText={rejection.formState.errors.reason?.message} />}
      </Stack></DialogContent>
      <DialogActions><Button color="inherit" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" color={action === "reject" ? "error" : "primary"} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : action === "approve" ? "Approve" : "Reject"}</Button></DialogActions>
    </form>
  </Dialog>;
}
