import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: 2 }}>
      <Box sx={{ width: "100%", maxWidth: 440, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, p: { xs: 2.5, sm: 3.5 } }}>
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ mb: 2.5 }}>
          <Box component="img" src="/brand/logo-eps.png" alt="EPS" sx={{ width: 56, height: 56, objectFit: "contain", display: "block", flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" sx={{ lineHeight: 1.2 }}>STS Platform</Typography>
            <Typography variant="caption" color="text.secondary">Construction Operations</Typography>
          </Box>
        </Stack>
        {children}
      </Box>
    </Box>
  );
}
