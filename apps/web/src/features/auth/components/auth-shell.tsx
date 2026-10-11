import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// wide: two-column-friendly width on md+ screens (register form); default is the
// single-column auth width so short forms stay centered and compact.
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: 2 }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: wide ? { xs: 440, md: 760 } : 440,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: { xs: 2.5, sm: 3 },
          transition: (t) => t.transitions.create("max-width", { duration: t.transitions.duration.shorter }),
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <Box component="img" src="/brand/logo-eps.png" alt="EPS" sx={{ width: 64, height: 64, objectFit: "contain", display: "block", flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" sx={{ lineHeight: 1.15 }}>STS Platform</Typography>
            <Typography variant="caption" color="text.secondary">Construction Operations</Typography>
          </Box>
        </Stack>
        {children}
      </Box>
    </Box>
  );
}
