import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// Compact empty state for a section inside a page (dashed frame + muted icon).
// Page-level empties use EmptyState below.
export function EmptySection({
  icon,
  title,
  description,
  action,
  dense = false,
  height,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  dense?: boolean;
  /** Fixed height for chart/table placeholders, so the layout does not jump when data arrives. */
  height?: number;
}) {
  return (
    <Box
      sx={{
        ...(height ? { height, display: "grid", placeItems: "center" } : {}),
        py: dense ? 2.5 : 4,
        px: 2,
        textAlign: "center",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "grey.50",
      }}
    >
      <Stack spacing={1} alignItems="center">
        {icon ? <Box sx={{ color: "text.disabled", display: "flex", "& .MuiSvgIcon-root": { fontSize: dense ? 26 : 30 } }}>{icon}</Box> : null}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420 }}>
            {description}
          </Typography>
        ) : null}
        {action}
      </Stack>
    </Box>
  );
}

// Centered empty/coming-soon state. Visual only — no business logic.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent sx={{ p: 4, textAlign: "center" }}>
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480, mx: "auto" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: "primary.light",
              color: "primary.dark",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
          {action}
        </Stack>
      </CardContent>
    </Card>
  );
}
