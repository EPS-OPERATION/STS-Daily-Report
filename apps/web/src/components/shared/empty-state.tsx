import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

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
              borderRadius: 3,
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
