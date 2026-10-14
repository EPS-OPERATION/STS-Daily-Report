import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// One confirmation dialog for every destructive/irreversible action.
// Replaces window.confirm and the per-feature hand-rolled dialogs.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "error",
  loading = false,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "error" | "primary" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {description ? <Typography variant="body2">{description}</Typography> : null}
        {children}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" disabled={loading} onClick={onClose}>{cancelLabel}</Button>
        <Button color={tone} disabled={loading} onClick={onConfirm}>{loading ? "Working…" : confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
