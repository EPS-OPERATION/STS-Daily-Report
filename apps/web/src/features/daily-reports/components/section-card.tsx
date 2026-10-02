import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// Numbered form section used by both shifts of the field report.
export function SectionCard({
  index,
  title,
  subtitle,
  tone = "primary",
  children,
}: {
  index: number;
  title: string;
  subtitle?: string;
  tone?: "primary" | "navy";
  children: ReactNode;
}) {
  return (
    <Card sx={{ mb: 2, overflow: "visible" }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: tone === "navy" ? "navy.main" : "primary.main",
              color: "common.white",
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              fontWeight: 700,
              mt: 0.25,
            }}
          >
            {index}
          </Box>
          <Box>
            <Typography variant="h5">{title}</Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
