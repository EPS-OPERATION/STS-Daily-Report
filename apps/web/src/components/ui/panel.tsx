import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// Bordered section for non-table content (charts, lists, stat blocks). Without `title`/`actions`
// it is just the container, for panels that render their own header. `fill` stretches it to the
// height of its grid cell.
export function Panel({
  title,
  subtitle,
  actions,
  fill = false,
  children,
  sx,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  fill?: boolean;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, ...(fill ? { height: "100%" } : {}), ...sx }}>
      {title || actions ? (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
          <Box>
            {title ? <Typography variant="h5">{title}</Typography> : null}
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {actions}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}
