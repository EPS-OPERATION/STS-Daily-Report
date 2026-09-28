import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
      <Stack spacing={0.5}>
        <Typography variant="h3">{title}</Typography>
        {subtitle ? (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      {actions ? <Stack direction="row" spacing={1}>{actions}</Stack> : null}
    </Stack>
  );
}
