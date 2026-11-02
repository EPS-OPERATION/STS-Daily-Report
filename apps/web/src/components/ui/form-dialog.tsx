import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useId, type FormEvent, type ReactNode } from "react";

// Shell for every form-style dialog: title, scrolling body, action row. Closing is blocked while
// `busy`, `mobileFullScreen` fills the screen on phones, and `onSubmit` turns the dialog into a <form>
// (put a `type="submit"` button in `actions`). Confirmations use ConfirmDialog instead.
export function FormDialog({
  open = true,
  title,
  onClose,
  busy = false,
  maxWidth = "sm",
  dividers = false,
  mobileFullScreen = false,
  onSubmit,
  actions,
  children,
}: {
  open?: boolean;
  title: ReactNode;
  onClose: () => void;
  busy?: boolean;
  maxWidth?: "xs" | "sm" | "md" | "lg";
  /** Rules above and below the body (long forms). */
  dividers?: boolean;
  mobileFullScreen?: boolean;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  actions: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const body = (
    <>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent dividers={dividers}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>
    </>
  );
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth={maxWidth}
      fullScreen={mobileFullScreen && phone}
      aria-labelledby={titleId}
    >
      {onSubmit ? (
        <form
          noValidate
          // React bubbles events through portals: never let this submit reach a form that opened the dialog.
          onSubmit={(event) => {
            event.stopPropagation();
            onSubmit(event);
          }}
        >
          {body}
        </form>
      ) : (
        body
      )}
    </Dialog>
  );
}
