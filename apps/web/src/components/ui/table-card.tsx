import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// Standard wrapper for table sections: card + header row (title / actions) +
// TableContainer body + optional footer (pagination). One container style for
// every report table in the app.
export function TableCard({
  title,
  actions,
  children,
  footer,
  sx,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  sx?: object;
}) {
  return (
    <Card variant="outlined" sx={sx}>
      {(title || actions) && (
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          {title ? <Typography variant="h6">{title}</Typography> : null}
          {actions ? <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>{actions}</Stack> : null}
        </Stack>
      )}
      {children}
      {footer ? <Stack sx={{ borderTop: 1, borderColor: "divider" }}>{footer}</Stack> : null}
    </Card>
  );
}
