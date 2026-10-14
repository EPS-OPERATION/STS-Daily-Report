import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// Bordered section for non-table content (charts, lists, stat blocks).
// Replaces the ad-hoc `Box border borderRadius p` pattern used across pages.
export function Panel({
  title,
  subtitle,
  actions,
  children,
  sx,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%", ...sx }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        {(title || actions) && (
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: title ? 1.5 : 0 }}>
            {title ? (
              <Stack>
                <Typography variant="h5">{title}</Typography>
                {subtitle ? <Typography variant="caption" color="text.secondary">{subtitle}</Typography> : null}
              </Stack>
            ) : null}
            {actions ? <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>{actions}</Stack> : null}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
