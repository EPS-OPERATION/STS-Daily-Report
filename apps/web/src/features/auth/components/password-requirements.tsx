import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { checkPassword } from "@sts/shared";
import type { ReactNode } from "react";

function Rule({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: met ? "success.main" : "text.disabled" }}>
      <CheckOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
      <Typography variant="body2" sx={{ color: "inherit", lineHeight: 1.4 }}>
        {children}
      </Typography>
    </Stack>
  );
}

// Live checklist mirroring checkPassword (@sts/shared) — used on the register and
// reset-password forms so the rule the API enforces is visible while typing.
// Compact: the four class rules run in a two-column grid to save vertical space.
export function PasswordRequirements({ password }: { password: string }) {
  const checks = checkPassword(password);
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
        Your password must contain:
      </Typography>
      <Stack spacing={0.5}>
        <Rule met={checks.length}>At least 8 characters</Rule>
        <Box>
          <Rule met={checks.classRequirement}>At least 3 of the following:</Rule>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5, rowGap: 0.25, pl: 3, mt: 0.25 }}>
            <Rule met={checks.lower}>Lowercase (a-z)</Rule>
            <Rule met={checks.upper}>Uppercase (A-Z)</Rule>
            <Rule met={checks.digit}>Numbers (0-9)</Rule>
            <Rule met={checks.special}>Special (!@#$%^&amp;*)</Rule>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
